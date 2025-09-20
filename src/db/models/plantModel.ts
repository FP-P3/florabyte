import { db } from "../config/mongodb";

export class PlantModel {
  static async AddPlant(
    label: object,
    imageUrl: string,
    part: string,
    plantingPlan: object,
    care: object,
    schedule: [],
    notes: [],
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
      userId,
    };
    return await db.collection("Plants").insertOne(payload);
  }
}
