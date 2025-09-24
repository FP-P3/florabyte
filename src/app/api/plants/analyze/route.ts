import cloudinary from "@/db/config/cloudinary";
import { db } from "@/db/config/mongodb";
import {
  Care,
  EmptyObj,
  PlantAnalysis,
  ProductDoc,
  ProductRecommendation,
} from "@/types/types";
import { EmbedContentResponse, GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
const MODEL_VISION = process.env.GEMINI_MODEL || "";
const MODEL_EMBED = "text-embedding-004";
const PRODUCTS_COLL = "Products";
const VECTOR_INDEX = "products_vector_index";

const ONE_PROMPT = `TASK:
You are a botanist expert. Analyze the following PHOTO and identify whether it contains a PLANT. If yes, guess its species and provide a short planting & care plan. Reply with ONLY VALID JSON (no extra text, no markdown, no backticks) using the following schema:

{
  "isPlant": boolean,
  "confidence": number,
  "label": {
    "scientificName": "string|null",
    "commonName": "string|null",
    "genus": "string|null",
    "family": "string|null"
  },
  "part": "whole|leaf|flower|fruit|stem|unknown",
  "plantingPlan": {
    "medium": "string",
    "potSize": "string",
    "steps": ["string"]
  },
  "care": {
    "light": { "level": "low|medium|high|full sun", "explanation": "string" },
    "water": { "level": "low|moderate|high", "explanation": "string" },
    "soil": { "level": "poor|average|rich|well-draining", "explanation": "string" },
    "commonIssues": ["string"],
    "suppliesNeeded": ["brief string (1–3 words each, e.g., 'NPK fertilizer','cocopeat mix','pruning shears')"]
  },
  "schedule": [
    { "type": "water"|"fertilize"|"prune"|"repot"|"inspect", "intervalDays": number, "notes": "string" }
  ],
  "notes": ["string"],
  "altCandidates": [
    { "commonName": "string", "confidence": number }
  ],
  "productRecommendations": {
    "vectorSearch": {
      "query": "string",
      "keywords": ["string"]
    }
  },
  "reason": "string|null"
}

DECISION RULES:
- If it is NOT a plant OR confidence < 0.6:
  - "isPlant": false
  - "confidence" <= 0.6
  - all "label" fields = null, "part"="unknown", "plantingPlan"={}, "care"={}, "schedule"=[], "altCandidates":[], "productRecommendations": { "vectorSearch": { "query": "", "keywords": [] } }
  - "reason" must be a **specific explanation** (e.g., "object is furniture", "image shows artificial plant", "picture is an animal", "image too blurry to identify")
- If it IS a plant:
  - fill in label according to certainty level (can stop at genus/family if unsure)
  - "suppliesNeeded" must be brief (1–3 words each)
  - "productRecommendations.vectorSearch.query" = a short sentence (max 200 characters) for embedding-based product search. Combine care needs: fertilizers, media, tools, pesticides, etc.
  - "productRecommendations.vectorSearch.keywords" = array of 6–12 relevant product terms/phrases
  - "reason" = null

GUIDELINES:
- Use only visual cues from the image.
- Differentiate between real plants and artificial/illustrations.
- If multiple objects exist, focus on the most dominant plant.
- Respond in English, concise and practical.

OUTPUT: Valid JSON according to the schema above, with no additional text.
`;

// sanitizer: strip markdown fences and fallback to first {...}
function extractJson(raw: string): string {
  const s = (raw ?? "").trim();
  const fenced = s.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first)
    return s.slice(first, last + 1).trim();
  return s;
}

// Type guard to narrow Care | EmptyObj
function isCare(value: Care | EmptyObj): value is Care {
  return typeof (value as Partial<Care>).suppliesNeeded !== "undefined";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
      });
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const contents = [
      { inlineData: { mimeType, data: base64Image } },
      { text: ONE_PROMPT },
    ];
    const response = await ai.models.generateContent({
      model: MODEL_VISION,
      contents,
    });

    const raw = response.text ?? "";
    const cleaned = extractJson(String(raw));
    let aiJson: PlantAnalysis;
    try {
      aiJson = JSON.parse(cleaned) as PlantAnalysis;
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned non-JSON", raw, cleaned }),
        { status: 502 }
      );
    }

    console.log(aiJson, "<- aiJson");

    const ok = !!aiJson?.isPlant && (aiJson?.confidence ?? 0) >= 0.6;
    if (!ok) {
      return new Response(
        JSON.stringify({
          accepted: false,
          reason: aiJson?.reason || "Unidentified",
          ai: aiJson,
        }),
        { status: 400 }
      );
    }

    // Do not upload to Cloudinary here; upload later when user saves
    const imageUrl = "";

    const supplies: string[] = isCare(aiJson.care)
      ? aiJson.care.suppliesNeeded
      : [];
    const species =
      aiJson?.label?.scientificName ||
      aiJson?.label?.commonName ||
      "this plant";

    // Extract AI-provided vectorSearch cues when present
    const vs: { query?: string; keywords?: string[] } =
      (
        aiJson as unknown as {
          productRecommendations?: {
            vectorSearch?: { query?: string; keywords?: string[] };
          };
        }
      )?.productRecommendations?.vectorSearch ?? {};
    const aiKeywords: string[] = Array.isArray(vs?.keywords)
      ? (vs.keywords as string[])
      : [];

    // Build a list of search terms: individual keywords + supplies (deduped)
    const termSet = new Set<string>();
    for (const k of aiKeywords) {
      const s = String(k || "").trim();
      if (s) termSet.add(s);
    }
    for (const s of supplies) {
      const t = String(s || "").trim();
      if (t) termSet.add(t);
    }
    // Fallback to species name if nothing else
    if (termSet.size === 0 && species) termSet.add(species);
    const searchTerms = Array.from(termSet).slice(0, 12); // cap to avoid long latency

    console.log(searchTerms, "<- searchTerms for vector search");

    // Derive desired categories from AI keywords/supplies (align with Products.category values)
    const deriveCategories = (words: string[]): string[] => {
      const out = new Set<string>();
      for (const w of words) {
        const s = String(w).toLowerCase();
        if (/fertil/i.test(s) || /npk/.test(s) || /kompos/.test(s))
          out.add("fertilizer");
        if (
          /soil|media|potting|coco|peat|perlite|vermiculite|bark|moss/i.test(s)
        )
          out.add("soil");
        if (/pest|insect|fungic|mite|herbicide|pestisida|insektisida/i.test(s))
          out.add("pesticide");
        if (
          /tool|shear|gunting|sekop|shovel|sprayer|meter|glove|scissor|pot/i.test(
            s
          )
        )
          out.add("tools");
      }
      return Array.from(out);
    };
    const categoriesWanted = deriveCategories([...aiKeywords, ...supplies]);

    const Products = db.collection<ProductDoc>(PRODUCTS_COLL);

    // Aggregate results across per-term vector searches
    interface AccumProduct extends ProductRecommendation {
      score: number;
    }
    const productMap = new Map<string, AccumProduct>();

    for (const term of searchTerms) {
      try {
        const emb: EmbedContentResponse = await ai.models.embedContent({
          model: MODEL_EMBED,
          contents: term,
        });
        const vec = emb?.embeddings?.[0]?.values ?? [];
        if (!Array.isArray(vec) || vec.length === 0) continue;

        const baseFilter: {
          stock: { $gt: number };
          category?: { $in: string[] };
        } = {
          stock: { $gt: 0 },
        };
        if (categoriesWanted.length > 0) {
          baseFilter.category = { $in: categoriesWanted };
        }

        const termPipeline = [
          {
            $vectorSearch: {
              index: VECTOR_INDEX,
              path: "embedding",
              queryVector: vec,
              numCandidates: 80,
              limit: 10,
              filter: baseFilter,
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              price: 1,
              stock: 1,
              imgUrl: 1,
              category: 1,
              vectScore: { $meta: "vectorSearchScore" },
            },
          },
          {
            $addFields: {
              vectScoreSafe: { $ifNull: ["$vectScore", 0] },
              categoryBoost: {
                $cond: [{ $in: ["$category", categoriesWanted] }, 0.15, 0],
              },
              stockBoost: { $min: [{ $divide: ["$stock", 100] }, 0.2] },
              finalScore: {
                $add: ["$vectScoreSafe", "$categoryBoost", "$stockBoost"],
              },
            },
          },
          { $sort: { finalScore: -1 } },
          { $limit: 6 },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              price: 1,
              stock: 1,
              imgUrl: 1,
              category: 1,
              score: "$finalScore",
            },
          },
        ];

        const termResults = await Products.aggregate<AccumProduct>(
          termPipeline
        ).toArray();

        for (const prod of termResults) {
          if (!prod?._id) continue;
          const id = String(prod._id);
          const existing = productMap.get(id);
          if (!existing || prod.score > existing.score) {
            productMap.set(id, { ...prod, score: prod.score });
          }
        }
      } catch (e) {
        console.warn("Embedding/vector search failed for term", term, e);
      }
    }

    let productRecommendations: ProductRecommendation[] = Array.from(
      productMap.values()
    )
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((p) => ({ ...p }));

    // Sanitize scores to ensure no null/undefined propagate
    const normalizeScore = (val: unknown): number =>
      typeof val === "number" && Number.isFinite(val) ? val : 0;
    productRecommendations = productRecommendations.map((p) => ({
      ...p,
      score: normalizeScore((p as ProductRecommendation).score as unknown),
    }));

    // Fallbacks if still empty
    if (!productRecommendations || productRecommendations.length === 0) {
      // Simple top-stock fallback with constant score 0.4 as requested
      const fallbackMatch: Record<string, unknown> = { stock: { $gt: 0 } };
      const fallbackPipeline: Record<string, unknown>[] = [
        { $match: fallbackMatch },
        {
          $addFields: {
            categoryBoost: {
              $cond: [{ $in: ["$category", categoriesWanted] }, 0.15, 0],
            },
            stockBoost: { $min: [{ $divide: ["$stock", 100] }, 0.2] },
            finalScore: { $add: ["$stockBoost", "$categoryBoost"] },
          },
        },
        { $sort: { finalScore: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            price: 1,
            stock: 1,
            imgUrl: 1,
            category: 1,
            score: "$finalScore",
          },
        },
      ];
      productRecommendations = await Products.aggregate<ProductRecommendation>(
        fallbackPipeline
      ).toArray();
      productRecommendations = productRecommendations.map((p) => ({
        ...p,
        score: normalizeScore(p.score as unknown),
      }));
    }

    return new Response(
      JSON.stringify({
        accepted: true,
        imageUrl,
        ai: aiJson,
        productRecommendations,
      }),
      { status: 200 }
    );
  } catch (err: unknown) {
    console.log(err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ err: "Internal server error", detail: message }),
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { url } = (await req.json()) as { url: string };
  if (!url) {
    return new Response(JSON.stringify({ error: "No URL provided" }), {
      status: 400,
    });
  }
  const regex = /upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
  const match = url.match(regex);
  if (!match) throw new Error("Could not parse public_id from URL");
  const publicId = match[1]; // e.g. "plants/d8koco99zagffzvw347l"

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image", // or "video" / "raw"
    });
    console.log("Deleted:", res);
    return res;
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    throw err;
  }
}
