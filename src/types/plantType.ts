import type { PlantAnalysis, ProductRecommendation } from "@/types/types";

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
