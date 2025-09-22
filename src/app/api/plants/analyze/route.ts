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
import { UploadApiResponse } from "cloudinary";

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
    "light": "string",
    "water": "string",
    "soil": "string",
    "commonIssues": ["string"],
    "suppliesNeeded": ["string"]
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
  }
}

DECISION RULES:
- If it is NOT a plant OR confidence < 0.6:
  - "isPlant": false
  - "confidence" <= 0.6
  - all "label" fields = null, "part"="unknown", "plantingPlan"={}, "care"={}, "schedule"=[], "altCandidates":[], "productRecommendations": { "vectorSearch": { "query": "", "keywords": [] } }
- If it IS a plant:
  - fill in label according to certainty level (can stop at genus/family if unsure)
  - "suppliesNeeded" must be specific (e.g., "organic fertilizer","well-draining potting mix","perlite","moss pole","moisture meter","pruning shears")
  - "productRecommendations.vectorSearch.query" = a short sentence (max 200 characters) for embedding-based product search. Combine care needs: fertilizers, media, tools, pesticides, etc.
  - "productRecommendations.vectorSearch.keywords" = array of 6–12 relevant product terms/phrases, e.g., "NPK fertilizer", "cocopeat soil mix", "garden trowel", "sprayer", "organic fungicide", "30cm polybag", etc.

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

    const ok = !!aiJson?.isPlant && (aiJson?.confidence ?? 0) >= 0.6;
    if (!ok) {
      return new Response(
        JSON.stringify({
          accepted: false,
          reason: "Gambar bukan tanaman atau confidence < 0.6",
          ai: aiJson,
        }),
        { status: 400 }
      );
    }

    const cloudinaryResponse = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "plants",
              resource_type: "image",
              transformation: [{ fetch_format: "auto", quality: "auto" }],
            },
            (err, result) =>
              err ? reject(err) : resolve(result as UploadApiResponse)
          )
          .end(buffer);
      }
    );

    const imageUrl = cloudinaryResponse.secure_url as string;

    const supplies: string[] = isCare(aiJson.care)
      ? aiJson.care.suppliesNeeded
      : [];
    const species =
      aiJson?.label?.scientificName ||
      aiJson?.label?.commonName ||
      "this plant";
    const queryText =
      supplies.length > 0
        ? `Supplies needed for ${species}: ${supplies.join(", ")}`
        : `Supplies for plant care: fertilizer, potting mix, perlite, moisture meter, pruning shears, moss pole`;

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

    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: 200,
          limit: 8,
        },
      },
      { $match: { stock: { $gt: 0 } } },
      {
        $project: {
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

    const productRecommendations =
      await Products.aggregate<ProductRecommendation>(pipeline).toArray();

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
