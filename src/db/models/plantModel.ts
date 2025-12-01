import { ObjectId } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import cloudinary from "../config/cloudinary";
import { db } from "../config/mongodb";
import type {
  Care,
  EmptyObj,
  PlantAnalysis,
  ProductDoc,
  ProductRecommendation,
  ScheduleItem,
} from "@/types/types";

const aiClient = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
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

function isCare(value: Care | EmptyObj): value is Care {
  return typeof (value as Partial<Care>).suppliesNeeded !== "undefined";
}

export class GeminiParsingError extends Error {
  constructor(public raw: string, public cleaned: string) {
    super("AI returned non-JSON");
    this.name = "GeminiParsingError";
  }
}

type GeminiAnalysisResult = {
  aiJson: PlantAnalysis;
  raw: string;
  cleaned: string;
  accepted: boolean;
  reason?: string;
  supplies: string[];
  species: string;
};

type ProductFetchResult = {
  productRecommendations: ProductRecommendation[];
  terms: string[];
  diagnostics: Record<string, number>;
};

interface AIRecoShape {
  productRecommendations?: { vectorSearch?: { keywords?: string[] } };
}

export class PlantModel {
  static async AddPlant(
    label: object,
    imageUrl: string,
    part: string,
    plantingPlan: object,
    care: object,
    schedule: ScheduleItem[],
    notes: string[],
    recommendedProducts: ProductRecommendation[],
    userId: string | null
  ) {
    const payload = {
      label,
      imageUrl,
      part,
      plantingPlan,
      care,
      schedule,
      notes,
      recommendedProducts,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return await db.collection("Plants").insertOne(payload);
  }

  static async getPlantsByUserId(userId: string) {
    return await db
      .collection("Plants")
      .aggregate([
        {
          $match: {
            userId: userId,
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();
  }

  static async deletePlantById(plantId: string, userId: string) {
    const result = await db.collection("Plants").deleteOne({
      _id: new ObjectId(plantId),
      userId,
    });
    if (result.deletedCount === 0) {
      throw new Error("Plant not found");
    }
  }

  static async getPlantById(plantId: string) {
    return await db.collection("Plants").findOne({
      _id: new ObjectId(plantId),
    });
  }

  static async analyzePlantImage(file: File): Promise<GeminiAnalysisResult> {
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const contents = [
      { inlineData: { mimeType, data: base64Image } },
      { text: ONE_PROMPT },
    ];
    const response = await aiClient.models.generateContent({
      model: MODEL_VISION,
      contents,
    });

    const raw = response.text ?? "";
    const cleaned = extractJson(String(raw));
    let aiJson: PlantAnalysis;
    try {
      aiJson = JSON.parse(cleaned) as PlantAnalysis;
    } catch {
      throw new GeminiParsingError(raw, cleaned);
    }

    const accepted = !!aiJson?.isPlant && (aiJson?.confidence ?? 0) >= 0.6;
    const supplies: string[] = isCare(aiJson.care)
      ? aiJson.care.suppliesNeeded
      : [];
    const species =
      aiJson?.label?.scientificName ||
      aiJson?.label?.commonName ||
      "this plant";

    return {
      aiJson,
      raw,
      cleaned,
      accepted,
      reason: aiJson?.reason || "Unidentified",
      supplies,
      species,
    };
  }

  static async fetchRecommendedProducts(params: {
    aiJson: PlantAnalysis;
    supplies: string[];
    species?: string;
  }): Promise<ProductFetchResult> {
    const { aiJson, supplies, species } = params;
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

    const Products = db.collection<ProductDoc>(PRODUCTS_COLL);
    interface AggProd extends ProductRecommendation {
      score: number;
    }
    const productMap = new Map<string, AggProd>();
    const diagnostics: Record<string, number> = {};

    for (const term of terms) {
      try {
        const emb = await aiClient.models.embedContent({
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

    return { productRecommendations, terms, diagnostics };
  }

  static async deleteImageByUrl(url: string) {
    const regex = /upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
    const match = url.match(regex);
    if (!match) throw new Error("Could not parse public_id from URL");
    const publicId = match[1];

    return cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  }
}
