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
  static async getPendingWithProducts(userId: string) {
    // --- Ambil cart 'pending' ---
    const cart = await db.collection("cart").findOne({
      userId: new ObjectId(userId),
      status: "pending",
    });

    // Kalau belum ada cart, balikin kosong
    if (!cart) {
      return { items: [], total: 0 };
    }

    // --- Hitung qty per produk dari duplikasi productIds ---
    // contoh: [A, A, B] => { A: 2, B: 1 }
    const qtyById: Record<string, number> = {};
    for (const oid of cart.productIds || []) {
      const key = oid.toString();
      qtyById[key] = (qtyById[key] || 0) + 1;
    }

    // --- Ambil data produk unik yang ada di cart ---
    const uniqueIds: ObjectId[] = [];
    for (const idStr in qtyById) {
      uniqueIds.push(new ObjectId(idStr));
    }

    const products = await db
      .collection("Products")
      .find({ _id: { $in: uniqueIds } })
      .project({ name: 1, price: 1, imgUrl: 1 })
      .toArray();

    // --- Bentuk items untuk UI ---
    // items: [{ productId, name, price, imgUrl, qty }]
    const items: Array<{
      productId: string;
      name: string;
      price: number;
      imgUrl: string;
      qty: number;
    }> = [];

    for (const prod of products) {
      const idStr = prod._id.toString();
      items.push({
        productId: idStr,
        name: (prod as any).name || "Unknown",
        price: Number((prod as any).price) || 0,
        imgUrl: (prod as any).imgUrl || "",
        qty: qtyById[idStr] || 0,
      });
    }

    return {
      items, // siap dirender
      total: Number(cart.total) || 0, // total dari dokumen cart
    };
  }
}

export default CartModel;
