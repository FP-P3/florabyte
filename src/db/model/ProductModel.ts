import { db } from "../config/mongodb";
export default class ProductModel {
  static async getAll() {
    return await db.collection("Products").find().toArray();
  }

  static async getByCategory(category: string) {
    return await db.collection("Products").find({ category }).toArray();
  }
}
