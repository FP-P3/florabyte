import { ObjectId } from "mongodb";
import { db } from "../config/mongodb";
import * as z from "zod";

type ProductDoc = {
  _id: ObjectId;
  name?: string;
  price?: number;
  imgUrl?: string;
};

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
      .findOne<ProductDoc>(
        { _id: new ObjectId(productId) },
        { projection: { price: 1 } }
      );

    if (!product) {
      throw new Error("Produk tidak ditemukan");
    }

    const price = Number(product?.price ?? 0);

    // --- Cek apakah user sudah punya cart 'pending' ---
    const userObjectId = new ObjectId(userId);
    const existingCart = await db.collection<CartDoc>("cart").findOne({
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
      const insertRes = await db
        .collection<CartDoc>("cart")
        .insertOne(newDoc as Omit<CartDoc, "_id"> & { createdAt: Date });
      return {
        cartId: insertRes.insertedId.toString(),
        total: newDoc.total,
      };
    }

    // --- Kalau SUDAH ada cart: tambahkan produk & update total ---
    await db.collection("cart").updateOne({ _id: existingCart._id }, {
      $push: { productIds: new ObjectId(productId) },
      $inc: { total: price },
    } as unknown as Record<string, unknown>);

    // total baru = total lama + price produk yang baru ditambah
    const newTotal = Number(existingCart.total || 0) + price;

    return {
      cartId: existingCart._id.toString(),
      total: newTotal,
    };
  }
  static async getPendingWithProducts(userId: string) {
    // --- Ambil cart 'pending' ---
    const cart = await db.collection<CartDoc>("cart").findOne({
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
      .find<ProductDoc>({ _id: { $in: uniqueIds } })
      .project<ProductDoc>({ name: 1, price: 1, imgUrl: 1 })
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
        name: prod.name || "Unknown",
        price: Number(prod.price ?? 0),
        imgUrl: prod.imgUrl || "",
        qty: qtyById[idStr] || 0,
      });
    }

    return {
      items, // siap dirender
      total: Number(cart.total) || 0, // total dari dokumen cart
    };
  }
  static async updateQty(
    userId: string,
    productId: string,
    action: "increase" | "decrease"
  ) {
    const userObjectId = new ObjectId(userId);
    const productObjectId = new ObjectId(productId);

    // Ambil produk untuk harga
    const product = await db
      .collection("Products")
      .findOne<ProductDoc>(
        { _id: productObjectId },
        { projection: { price: 1 } }
      );
    const price = Number(product?.price ?? 0);

    // Ambil cart pending
    const cart = await db.collection<CartDoc>("cart").findOne({
      userId: userObjectId,
      status: "pending",
    });
    if (!cart) {
      throw new Error("Cart tidak ditemukan");
    }

    if (action === "increase") {
      // Push productId dan inc total
      await db.collection("cart").updateOne({ _id: cart._id }, {
        $push: { productIds: productObjectId },
        $inc: { total: price },
      } as unknown as Record<string, unknown>);
    } else if (action === "decrease") {
      // Pull satu instance dan dec total
      const productIds = cart.productIds || [];
      const index = productIds.findIndex(
        (id: ObjectId) => id.toString() === productId
      );
      if (index === -1) {
        throw new Error("Produk tidak ada di cart");
      }
      productIds.splice(index, 1); // Remove satu instance

      if (productIds.length === 0) {
        // Jika kosong, hapus cart
        await db.collection<CartDoc>("cart").deleteOne({ _id: cart._id });
      } else {
        await db.collection("cart").updateOne({ _id: cart._id }, {
          $set: { productIds },
          $inc: { total: -price },
        } as unknown as Record<string, unknown>);
      }
    }
  }
  static async removeItem(userId: string, productId: string) {
    const userObjectId = new ObjectId(userId);
    const productObjectId = new ObjectId(productId);

    // Ambil produk untuk harga
    const product = await db
      .collection("Products")
      .findOne<ProductDoc>(
        { _id: productObjectId },
        { projection: { price: 1 } }
      );
    if (!product) {
      throw new Error("Produk tidak ditemukan");
    }
    const price = Number(product.price ?? 0);

    // Ambil cart pending
    const cart = await db.collection<CartDoc>("cart").findOne({
      userId: userObjectId,
      status: "pending",
    });
    if (!cart) {
      throw new Error("Cart tidak ditemukan");
    }

    // Hitung qty produk ini di cart
    const productIds = cart.productIds || [];
    const qty = productIds.filter(
      (id: ObjectId) => id.toString() === productId
    ).length;
    if (qty === 0) {
      throw new Error("Produk tidak ada di cart");
    }

    // Pull semua instance produk ini
    const newProductIds = productIds.filter(
      (id: ObjectId) => id.toString() !== productId
    );

    if (newProductIds.length === 0) {
      // Jika kosong, hapus cart
      await db.collection<CartDoc>("cart").deleteOne({ _id: cart._id });
    } else {
      await db.collection("cart").updateOne({ _id: cart._id }, {
        $set: { productIds: newProductIds },
        $inc: { total: -(price * qty) },
      } as unknown as Record<string, unknown>);
    }
  }
  static async setCheckoutInfo(
    userId: string,
    info: {
      recipientName: string;
      recipientPhone: string;
      recipientAddress: string;
    }
  ) {
    if (!userId || !ObjectId.isValid(userId)) {
      throw new Error("userId tidak valid");
    }

    const schema = z.object({
      recipientName: z.string().trim().min(1, "Nama penerima wajib diisi"),
      recipientPhone: z.string().trim().min(6, "Nomor telepon tidak valid"),
      recipientAddress: z.string().trim().min(5, "Alamat terlalu singkat"),
    });
    const parsed = schema.parse(info);

    const res = await db.collection("cart").updateOne(
      { userId: new ObjectId(userId), status: "pending" },
      {
        $set: {
          recipientName: parsed.recipientName,
          recipientPhone: parsed.recipientPhone,
          recipientAddress: parsed.recipientAddress,
          updatedAt: new Date(),
        },
      }
    );
    if (res.matchedCount === 0) {
      throw new Error("Cart pending tidak ditemukan");
    }
  }
}

export default CartModel;
