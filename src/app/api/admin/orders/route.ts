import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/db/config/mongodb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const authCookie = req.cookies.get("Authorization")?.value;
        if (!authCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const [type, token] = authCookie.split(" ");
        if (type !== "Bearer" || !token) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role?: string };
        if (decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Inline migration: ensure carts with paid status have orderStatus
        try {
            await db.collection("cart").updateMany({ status: "paid", orderStatus: { $exists: false } }, { $set: { orderStatus: "Pending" } });
        } catch { }

        const carts = await db.collection("cart")
            .find({ status: { $in: ["paid", "cancelled"] } })
            .sort({ createdAt: -1 })
            .limit(400)
            .toArray();

        // Build aggregated items (name + qty) from productIds
        const productIdSet = new Set<string>();
        carts.forEach(c => (c.productIds || []).forEach((p: any) => { if (p) productIdSet.add(p.toString()); }));
        const productDocs = await db.collection("Products").find({ _id: { $in: Array.from(productIdSet).map(id => new (require('mongodb').ObjectId)(id)) } }).project({ name: 1, price: 1 }).toArray();
        const productMap = new Map(productDocs.map((p: any) => [p._id.toString(), { name: p.name, price: Number(p.price) || 0 }]));

        const orders = carts.map((c: any) => {
            const qtyBy: Record<string, number> = {};
            for (const pid of c.productIds || []) {
                const k = pid.toString();
                qtyBy[k] = (qtyBy[k] || 0) + 1;
            }
            const items = Object.entries(qtyBy).map(([pid, qty]) => ({
                productId: pid,
                name: productMap.get(pid)?.name || 'Unknown',
                price: productMap.get(pid)?.price || 0,
                qty,
            }));
            return {
                id: c._id.toString(),
                userId: c.userId?.toString() || '-',
                items,
                total: Number(c.total) || 0,
                status: c.orderStatus || (c.status === 'paid' ? 'Pending' : 'Dibatalkan'),
                paymentStatus: c.status === 'paid' ? 'paid' : 'cancelled',
                midtransOrderId: c.midtransOrderId,
                createdAt: (c.createdAt || new Date()).toISOString(),
                updatedAt: (c.createdAt || new Date()).toISOString(),
            };
        });
        return NextResponse.json({ orders });
    } catch (err: any) {
        console.error("GET /api/admin/orders error", err);
        return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
    }
}
