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

    // Incorporate AI-provided vectorSearch cues when present
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
    const baseQuery =
      supplies.length > 0
        ? `Supplies needed for ${species}: ${supplies.join(", ")}`
        : `Supplies for plant care: fertilizer, potting mix, perlite, moisture meter, pruning shears, moss pole`;
    // Build richer embedding text by including AI query and keywords
    const additions: string[] = [];
    if (typeof vs?.query === "string" && vs.query.trim().length > 0) {
      additions.push(vs.query.trim());
    }
    if (aiKeywords.length > 0) {
      additions.push(`Keywords: ${aiKeywords.join(", ")}`);
    }
    const queryText = [baseQuery, ...additions].join(". ");

    console.log(queryText, "<- queryText");

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

    // AI Embedding for Vector Search
    const embed: EmbedContentResponse = await ai.models.embedContent({
      model: MODEL_EMBED,
      contents: queryText,
    });

    const queryVector: number[] = embed?.embeddings?.[0]?.values ?? [];

    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Failed to create embedding for vector search",
        }),
        { status: 500 }
      );
    }

    const Products = db.collection<ProductDoc>(PRODUCTS_COLL);

    // Strict vector search: filter by stock and desired categories if inferred
    const filterStrict: {
      stock: { $gt: number };
      category?: { $in: string[] };
    } = { stock: { $gt: 0 } };
    if (categoriesWanted.length > 0)
      filterStrict.category = { $in: categoriesWanted };
    const pipelineStrict = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: 30,
          limit: 24,
          filter: filterStrict,
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
          categoryBoost: {
            $cond: [{ $in: ["$category", categoriesWanted] }, 0.15, 0],
          },
          stockBoost: { $min: [{ $divide: ["$stock", 100] }, 0.2] },
          finalScore: { $add: ["$vectScore", "$categoryBoost", "$stockBoost"] },
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

    let productRecommendations =
      await Products.aggregate<ProductRecommendation>(pipelineStrict).toArray();

    // Relaxed vector search: drop category filter if still empty
    if (!productRecommendations || productRecommendations.length === 0) {
      const pipelineRelaxed = [
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: "embedding",
            queryVector,
            numCandidates: 400,
            limit: 24,
            filter: { stock: { $gt: 0 } },
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
            categoryBoost: {
              $cond: [{ $in: ["$category", categoriesWanted] }, 0.15, 0],
            },
            stockBoost: { $min: [{ $divide: ["$stock", 100] }, 0.2] },
            finalScore: {
              $add: ["$vectScore", "$categoryBoost", "$stockBoost"],
            },
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
        pipelineRelaxed
      ).toArray();
    }

    // Regex fallback using keywords/supplies/species if still empty
    if (!productRecommendations || productRecommendations.length === 0) {
      const pool = Array.from(
        new Set(
          [...aiKeywords, ...supplies, species]
            .map((s) => String(s || "").trim())
            .filter(Boolean)
        )
      ).slice(0, 10);
      const escapeRegex = (s: string) =>
        s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = pool.map(escapeRegex).join("|");
      const orMatch = pattern
        ? [
            { name: { $regex: pattern, $options: "i" } },
            { description: { $regex: pattern, $options: "i" } },
            { category: { $regex: pattern, $options: "i" } },
          ]
        : [];
      const matchRegex: Record<string, unknown> = { stock: { $gt: 0 } };
      if (orMatch.length > 0)
        (matchRegex as Record<string, unknown>)["$or"] =
          orMatch as unknown as Record<string, unknown>[];
      if (categoriesWanted.length > 0)
        (matchRegex as Record<string, unknown>)["category"] = {
          $in: categoriesWanted,
        } as unknown as Record<string, unknown>;
      const pipelineRegex: Record<string, unknown>[] = [
        { $match: matchRegex },
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
            score: { $literal: 0.1 },
          },
        },
      ];
      productRecommendations = await Products.aggregate<ProductRecommendation>(
        pipelineRegex
      ).toArray();
    }

    // Final deterministic fallback: top in-stock products by desired categories, else any in-stock
    if (!productRecommendations || productRecommendations.length === 0) {
      const matchStage: Record<string, unknown> =
        categoriesWanted.length > 0
          ? { stock: { $gt: 0 }, category: { $in: categoriesWanted } }
          : { stock: { $gt: 0 } };
      const pipelineDefault: Record<string, unknown>[] = [
        { $match: matchStage },
        { $sort: { stock: -1 } },
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
            score: { $literal: 0.05 },
          },
        },
      ];
      productRecommendations = await Products.aggregate<ProductRecommendation>(
        pipelineDefault
      ).toArray();
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
