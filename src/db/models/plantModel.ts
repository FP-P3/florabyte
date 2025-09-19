import { db } from "../config/mongodb";

export class PlantModel {
  static async AddPlant(
    label: object,
    imageUrl: string,
    part: string,
    plantingPlan: object,
    care: object,
    schedule: [],
    notes: []
  ) {
    const payload = {
      label,
      imageUrl,
      part,
      plantingPlan,
      care,
      schedule,
      notes,
    };
    return await db.collection("Plants").insertOne(payload);
  }
}
