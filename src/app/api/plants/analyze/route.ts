import cloudinary from "@/db/config/cloudinary";
import { db } from "@/db/config/mongodb";
import {
  Care,
  EmptyObj,
  PlantAnalysis,
  ProductDoc,
  ProductRecommendation,
} from "@/types/types";
import { GoogleGenAI } from "@google/genai";

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

    // --- Vector search aggregation (per-keyword embeddings) ---
    interface AIRecoShape {
      productRecommendations?: { vectorSearch?: { keywords?: string[] } };
    }
    const vs = (aiJson as AIRecoShape).productRecommendations?.vectorSearch;
    const rawKeywords = Array.isArray(vs?.keywords) ? vs!.keywords! : [];
    const termSet = new Set<string>();
    for (const k of rawKeywords) {
      const t = String(k || "").trim();
      if (t) termSet.add(t);
    }
    for (const sup of supplies) {
      const t = String(sup || "").trim();
      if (t) termSet.add(t);
    }
    if (species) termSet.add(species);
    const terms = Array.from(termSet).slice(0, 15);
    console.log("vector terms:", terms);

    const Products = db.collection<ProductDoc>(PRODUCTS_COLL);
    interface AggProd extends ProductRecommendation {
      score: number;
    }
    const productMap = new Map<string, AggProd>();
    const diagnostics: Record<string, number> = {};

    for (const term of terms) {
      try {
        const emb = await ai.models.embedContent({
          model: MODEL_EMBED,
          contents: term,
        });
        const vec = emb?.embeddings?.[0]?.values ?? [];
        if (!Array.isArray(vec) || vec.length === 0) {
          diagnostics[`embed_empty_${term}`] = 1;
          continue;
        }
        let pipeline: Record<string, unknown>[] = [
          {
            $vectorSearch: {
              index: VECTOR_INDEX,
              path: "embedding",
              queryVector: vec,
              numCandidates: 80,
              limit: 12,
            },
          },
          { $match: { stock: { $gt: 0 } } },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              price: 1,
              stock: 1,
              imgUrl: 1,
              category: 1,
              score: { $meta: "vectorSearchScore" },
            },
          },
          { $limit: 6 },
        ];
        let res: AggProd[] = [];
        try {
          res = await Products.aggregate<AggProd>(pipeline).toArray();
        } catch (innerErr) {
          const msg =
            innerErr instanceof Error ? innerErr.message : String(innerErr);
          // If still index-related, retry without the $match stage (accept all, we'll filter manually)
          if (/needs to be indexed/i.test(msg)) {
            diagnostics[`retry_no_match_${term}`] = 1;
            pipeline = [
              {
                $vectorSearch: {
                  index: VECTOR_INDEX,
                  path: "embedding",
                  queryVector: vec,
                  numCandidates: 80,
                  limit: 12,
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
                  score: { $meta: "vectorSearchScore" },
                },
              },
            ];
            const retryRes = await Products.aggregate<AggProd>(
              pipeline
            ).toArray();
            res = retryRes.filter(
              (p: AggProd) => typeof p.stock === "number" && p.stock > 0
            );
          } else {
            throw innerErr;
          }
        }
        diagnostics[`hits_${term}`] = res.length;
        for (const r of res) {
          if (!r?._id) continue;
          const id = String(r._id);
          const existing = productMap.get(id);
          if (!existing || r.score > existing.score) {
            productMap.set(id, r);
          }
        }
      } catch (e) {
        diagnostics[`error_${term}`] = 1;
        console.warn("vector term failed", term, e);
      }
    }

    const productRecommendations: ProductRecommendation[] = Array.from(
      productMap.values()
    )
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((p) => ({ ...p }));

    return new Response(
      JSON.stringify({
        accepted: true,
        imageUrl,
        ai: aiJson,
        productRecommendations,
        terms,
        diagnostics,
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
