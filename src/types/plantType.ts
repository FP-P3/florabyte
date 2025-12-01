import type {
  PlantAnalysis,
  ProductRecommendation,
  PlantingPlan,
  Care,
  EmptyObj,
  ScheduleItem,
} from "@/types/types";

export type GeminiAnalysisResult = {
  aiJson: PlantAnalysis;
  raw: string;
  cleaned: string;
  accepted: boolean;
  reason?: string;
  supplies: string[];
  species: string;
};

export type ProductFetchResult = {
  productRecommendations: ProductRecommendation[];
  terms: string[];
  diagnostics: Record<string, number>;
};

export interface AIRecoShape {
  productRecommendations?: { vectorSearch?: { keywords?: string[] } };
}

export type PlantSavePayload = {
  label: Record<string, unknown>;
  part: string;
  plantingPlan: PlantingPlan | EmptyObj;
  care: Care | EmptyObj;
  schedule: ScheduleItem[];
  notes: string[];
  recommendedProducts?: ProductRecommendation[];
};
