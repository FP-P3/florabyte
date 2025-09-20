import { ObjectId } from "mongodb";
import { db } from "../config/mongodb";

type CartStatus = "pending" | "paid" | "cancelled";

class CartModel {
  static async create(userId: string, productId: string) {
    if (!userId || !ObjectId.isValid(userId)) {
      throw new Error("userId tidak valid");
    }
    if (!productId || !ObjectId.isValid(productId)) {
      throw new Error("productId tidak valid");
    }

    // --- Ambil produk untuk tahu harganya ---
    const product = await db
      .collection("Products")
      .findOne({ _id: new ObjectId(productId) }, { projection: { price: 1 } });

    if (!product) {
      throw new Error("Produk tidak ditemukan");
    }

    const price = Number((product as any).price) || 0;

    // --- Cek apakah user sudah punya cart 'pending' ---
    const userObjectId = new ObjectId(userId);
    const existingCart = await db.collection("cart").findOne({
      userId: userObjectId,
      status: "pending",
    });

    // --- Kalau BELUM ada cart: buat baru ---
    if (!existingCart) {
      const newDoc = {
        userId: userObjectId,
        productIds: [new ObjectId(productId)], // duplikat = qty
        total: price,
        status: "pending",
        midtransOrderId: "",
        createdAt: new Date(),
      };
      const insertRes = await db.collection("cart").insertOne(newDoc);
      return {
        cartId: insertRes.insertedId.toString(),
        total: newDoc.total,
      };
    }

    // --- Kalau SUDAH ada cart: tambahkan produk & update total ---
    await db.collection("cart").updateOne({ _id: existingCart._id }, {
      $push: { productIds: new ObjectId(productId) },
      $inc: { total: price },
    } as any);

    // total baru = total lama + price produk yang baru ditambah
    const newTotal = Number(existingCart.total || 0) + price;

    return {
      cartId: existingCart._id.toString(),
      total: newTotal,
    };
  }
}

export default CartModel;
