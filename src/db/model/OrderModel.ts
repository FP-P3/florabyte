import { ObjectId } from "mongodb";
import { db } from "../config/mongodb";

export type OrderStatus = "pending" | "paid" | "cancelled";

export interface OrderHistoryItemProduct {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface OrderHistoryItem {
  _id: string;
  midtransOrderId: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderHistoryItemProduct[];
}

class OrderModel {
  /**
   * Ambil riwayat order (dokumen cart yang sudah jadi transaksi) untuk user.
   * Saat ini cart dengan status "paid" atau "cancelled" dianggap sebagai riwayat.
   */
  static async getHistory(
    userId: string,
    limit = 30
  ): Promise<OrderHistoryItem[]> {
    if (!userId || !ObjectId.isValid(userId)) return [];
    const userObjectId = new ObjectId(userId);

    const rawOrders = await db
      .collection("cart")
      .find({ userId: userObjectId, status: { $in: ["paid", "cancelled"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (!rawOrders.length) return [];

    // Kumpulkan semua productIds unik dari semua order
    const allProductObjectIds: ObjectId[] = [];
    for (const o of rawOrders) {
      for (const pid of o.productIds || []) {
        if (pid && pid instanceof ObjectId) allProductObjectIds.push(pid);
      }
    }
    // Uniq
    const uniqMap = new Map<string, ObjectId>();
    for (const id of allProductObjectIds) uniqMap.set(id.toString(), id);
    const uniqueProductIds = Array.from(uniqMap.values());

    // Ambil produk sekali (projection minimal)
    type MinimalProductDoc = { _id: ObjectId; name?: unknown; price?: unknown };
    const products = await db
      .collection<MinimalProductDoc>("Products")
      .find({ _id: { $in: uniqueProductIds } })
      .project({ name: 1, price: 1 })
      .toArray();
    const productMap = new Map<string, { name: string; price: number }>();
    for (const p of products) {
      const name = typeof p.name === "string" ? p.name : "Unknown";
      const priceRaw =
        typeof p.price === "number" || typeof p.price === "string"
          ? Number(p.price)
          : 0;
      productMap.set(p._id.toString(), {
        name,
        price: Number.isFinite(priceRaw) ? priceRaw : 0,
      });
    }

    // Bentuk hasil per order
    const result: OrderHistoryItem[] = [];
    for (const order of rawOrders) {
      const qtyById: Record<string, number> = {};
      for (const pid of order.productIds || []) {
        const key = pid.toString();
        qtyById[key] = (qtyById[key] || 0) + 1;
      }
      const items: OrderHistoryItemProduct[] = Object.entries(qtyById).map(
        ([id, qty]) => {
          const meta = productMap.get(id) || { name: "Unknown", price: 0 };
          return {
            productId: id,
            name: meta.name,
            price: meta.price,
            qty,
          };
        }
      );
      result.push({
        _id: order._id.toString(),
        midtransOrderId: order.midtransOrderId || "-",
        status: order.status,
        total: Number(order.total) || 0,
        createdAt: (order.createdAt || new Date()).toISOString(),
        items,
      });
    }
    return result;
  }
}

export default OrderModel;
