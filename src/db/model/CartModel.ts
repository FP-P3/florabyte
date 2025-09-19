import { ObjectId } from "mongodb";
import { db } from "../config/mongodb";

class CartModel {
  static async create(userId: string, productId: string) {
    return await db.collection("cart").insertOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
    });
  }
  static async getByUserIdWithProducts(userId: string) {
    return await db
      .collection("cart")
      .aggregate([
        {
          $match: { userId: new ObjectId(userId) },
        },
        {
          $lookup: {
            from: "Products",
            localField: "productId",
            foreignField: "_id",
            as: "productId",
          },
        },
      ])
      .toArray();
  }
  static async delete(userId: string, productId: string) {
    return await db.collection("cart").deleteOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
    });
  }
}

export default CartModel;
