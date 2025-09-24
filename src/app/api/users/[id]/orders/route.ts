import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

// Types for documents
type CartDoc = {
    _id: ObjectId;
    userId: ObjectId;
    productIds?: ObjectId[];
    total?: number;
    status: "paid" | "cancelled" | string;
    orderStatus?: "Pending" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan";
    midtransOrderId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
};

type ProductDoc = {
    _id: ObjectId;
    name: string;
    price: number;
};

type OrderItem = { productId: string; name: string; price: number; qty: number };

type OrderResponseItem = {
    id: string;
    items: OrderItem[];
    total: number;
    status: "Pending" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan";
    paymentStatus: "paid" | "cancelled";
    midtransOrderId?: string;
    createdAt: string;
    updatedAt: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
};

function isPromise<T>(obj: unknown): obj is Promise<T> {
    return typeof obj === "object" && obj !== null && "then" in (obj as Record<string, unknown>) &&
        typeof (obj as Record<string, unknown>).then === "function";
}

// GET /api/users/[id]/orders  (User can only fetch their own OR admin any)
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        // Normalize potential async params without using `any`
        const maybeParams = (context as { params: { id: string } | Promise<{ id: string }> }).params;
        const resolvedParams = isPromise<{ id: string }>(maybeParams) ? await maybeParams : maybeParams;
        const userId = resolvedParams.id;

        const authCookie = request.cookies.get("Authorization")?.value;
        if (!authCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const [type, token] = authCookie.split(" ");
        if (type !== "Bearer" || !token) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role?: string };

        if (decoded.id !== userId && decoded.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Migration: ensure orderStatus exists for paid carts
        try {
            await db
                .collection<CartDoc>("cart")
                .updateMany(
                    { userId: new ObjectId(userId), status: "paid", orderStatus: { $exists: false } },
                    { $set: { orderStatus: "Pending" } }
                );
        } catch {
            // no-op
        }

        const carts = (await db
            .collection<CartDoc>("cart")
            .find({ userId: new ObjectId(userId), status: { $in: ["paid", "cancelled"] } })
            .sort({ createdAt: -1 })
            .limit(200)
            .toArray()) as CartDoc[];

        // Collect unique product ids to resolve names/prices
        const productIdSet = new Set<string>();
        for (const c of carts) {
            for (const p of c.productIds || []) {
                if (p) productIdSet.add(p.toString());
            }
        }

        const ids = Array.from(productIdSet).map((id) => new ObjectId(id));
        const productDocs = (await db
            .collection<ProductDoc>("Products")
            .find({ _id: { $in: ids } })
            .project({ name: 1, price: 1 })
            .toArray()) as ProductDoc[];

        const productMap = new Map<string, { name: string; price: number }>(
            productDocs.map((p) => [p._id.toString(), { name: p.name, price: Number(p.price) || 0 }])
        );

        const orders: OrderResponseItem[] = carts.map((c) => {
            const qtyBy: Record<string, number> = {};
            for (const pid of c.productIds || []) {
                const k = pid.toString();
                qtyBy[k] = (qtyBy[k] || 0) + 1;
            }
            const items: OrderItem[] = Object.entries(qtyBy).map(([pid, qty]) => ({
                productId: pid,
                name: productMap.get(pid)?.name ?? "Unknown",
                price: productMap.get(pid)?.price ?? 0,
                qty,
            }));
            const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt || Date.now());
            const updatedAt = c.updatedAt instanceof Date ? c.updatedAt : new Date(c.updatedAt || c.createdAt || Date.now());
            const status: OrderResponseItem["status"] = (c.orderStatus as OrderResponseItem["status"]) ||
                (c.status === "paid" ? "Pending" : "Dibatalkan");
            const paymentStatus: OrderResponseItem["paymentStatus"] = c.status === "paid" ? "paid" : "cancelled";
            return {
                id: c._id.toString(),
                items,
                total: Number(c.total) || 0,
                status,
                paymentStatus,
                midtransOrderId: c.midtransOrderId,
                createdAt: createdAt.toISOString(),
                updatedAt: updatedAt.toISOString(),
                recipientName: c.recipientName,
                recipientPhone: c.recipientPhone,
                recipientAddress: c.recipientAddress,
            };
        });
        return NextResponse.json({ orders });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        console.error("GET /api/users/[id]/orders error", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
