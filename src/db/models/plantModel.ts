import { ObjectId } from "mongodb";
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
}
