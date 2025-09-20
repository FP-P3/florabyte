export type Part = "whole" | "leaf" | "flower" | "fruit" | "stem" | "unknown";
export type EmptyObj = Record<string, never>;

export interface Label {
  scientificName: string | null;
  commonName: string | null;
  genus: string | null;
  family: string | null;
}

export interface PlantingPlan {
  medium: string;
  potSize: string;
  steps: string[];
}

export interface Care {
  light: string;
  water: string;
  soil: string;
  commonIssues: string[];
  suppliesNeeded: string[];
}

type ScheduleType = "water" | "fertilize" | "prune" | "repot" | "inspect";

export interface ScheduleItem {
  type: ScheduleType;
  intervalDays: number;
  notes: string;
}

export interface AltCandidate {
  scientificName: string;
  confidence: number;
}

export interface PlantAnalysis {
  isPlant: boolean;
  confidence: number;
  label: Label;
  part: Part;
  plantingPlan: PlantingPlan | EmptyObj;
  care: Care | EmptyObj;
  schedule: ScheduleItem[];
  notes: string[];
  altCandidates: AltCandidate[];
}

export interface ProductRecommendation {
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
  category: string;
  score: number;
}

export interface ProductDoc {
  _id: unknown;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
  category: string;
  embedding: number[];
}

export interface PlantData {
  accepted: boolean;
  imageUrl: string;
  ai: {
    isPlant: boolean;
    confidence: number;
    label: {
      scientificName: string;
      commonName: string;
      genus: string;
      family: string;
    };
    part: string;
    plantingPlan: {
      medium: string;
      potSize: string;
      steps: string[];
    };
    care: {
      light: string;
      water: string;
      soil: string;
      commonIssues: string[];
      suppliesNeeded: string[];
    };
    schedule: Array<{
      type: string;
      intervalDays: number;
      notes: string;
    }>;
    notes: string[];
    altCandidates: Array<{
      scientificName: string;
      confidence: number;
    }>;
  };
  productRecommendations: [];
}

// Document shape returned by /api/plants
export interface PlantDoc {
  _id: string; // mongodb stringified id (middleware sets headers)
  label: {
    scientificName: string | null;
    commonName: string | null;
    genus: string | null;
    family: string | null;
  };
  imageUrl: string;
  part: string;
  plantingPlan: PlantingPlan | EmptyObj;
  care: Care | EmptyObj;
  schedule: Array<{
    type: string;
    intervalDays: number;
    notes: string;
  }>;
  notes: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}
