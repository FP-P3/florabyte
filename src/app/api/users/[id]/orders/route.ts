import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

// GET /api/users/[id]/orders  (User can only fetch their own OR admin any)
interface CartDocMinimal {
  _id: ObjectId;
  productIds?: ObjectId[];
  total?: number;
  status: string;
  orderStatus?: string;
  midtransOrderId?: string;
  createdAt?: Date;
}
interface ProductBasic {
  _id: ObjectId;
  name?: string;
  price?: number;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    // Next.js 15 dapat membuat params asynchronous; normalisasi di sini
    const rawParams = (
      context as
        | { params: { id: string } }
        | { params: Promise<{ id: string }> }
    ).params;
    const resolvedParams = (rawParams as Promise<{ id: string }>).then
      ? await (rawParams as Promise<{ id: string }>)
      : (rawParams as { id: string });
    const userId = resolvedParams.id;

    const authCookie = request.cookies.get("Authorization")?.value;
    if (!authCookie)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const [type, token] = authCookie.split(" ");
    if (type !== "Bearer" || !token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role?: string;
    };

    if (decoded.id !== userId && decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Migration: ensure orderStatus exists for paid carts
    try {
      await db
        .collection("cart")
        .updateMany(
          {
            userId: new ObjectId(userId),
            status: "paid",
            orderStatus: { $exists: false },
          },
          { $set: { orderStatus: "Pending" } }
        );
    } catch {}

    const carts = await db
      .collection<CartDocMinimal>("cart")
      .find({
        userId: new ObjectId(userId),
        status: { $in: ["paid", "cancelled"] },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    // Collect unique product ids to resolve names/prices
    const productIdSet = new Set<string>();
    carts.forEach((c) =>
      (c.productIds || []).forEach((p) => {
        if (p) productIdSet.add(p.toString());
      })
    );
    const productDocs = await db
      .collection<ProductBasic>("Products")
      .find({
        _id: { $in: Array.from(productIdSet).map((id) => new ObjectId(id)) },
      })
      .project({ name: 1, price: 1 })
      .toArray();
    const productMap = new Map(
      productDocs.map((p) => [
        p._id.toString(),
        { name: p.name || "Unknown", price: Number(p.price) || 0 },
      ])
    );

    const orders = carts.map((c) => {
      const qtyBy: Record<string, number> = {};
      for (const pid of c.productIds || []) {
        const k = pid.toString();
        qtyBy[k] = (qtyBy[k] || 0) + 1;
      }
      const items = Object.entries(qtyBy).map(([pid, qty]) => ({
        productId: pid,
        name: productMap.get(pid)?.name || "Unknown",
        price: productMap.get(pid)?.price || 0,
        qty,
      }));
      return {
        id: c._id.toString(),
        items,
        total: Number(c.total) || 0,
        status:
          c.orderStatus || (c.status === "paid" ? "Pending" : "Dibatalkan"),
        paymentStatus: c.status === "paid" ? "paid" : "cancelled",
        midtransOrderId: c.midtransOrderId,
        createdAt: (c.createdAt || new Date()).toISOString(),
        updatedAt: (c.createdAt || new Date()).toISOString(),
      };
    });
    return NextResponse.json({ orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("GET /api/users/[id]/orders error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
