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

        // Collect userIds for name lookup
        const userIdSet = new Set<string>();
        carts.forEach(c => { if (c.userId) userIdSet.add(c.userId.toString()); });
        let userMap = new Map<string, { name?: string; username?: string; phone?: string | null; address?: string | null }>();
        if (userIdSet.size) {
            try {
                const userDocs = await db.collection("users")
                    .find({ _id: { $in: Array.from(userIdSet).map(id => new (require('mongodb').ObjectId)(id)) } })
                    .project({ name: 1, username: 1, phone: 1, address: 1 })
                    .toArray();
                userMap = new Map(userDocs.map((u: any) => [u._id.toString(), { name: u.name, username: u.username, phone: u.phone ?? null, address: u.address ?? null }]));
            } catch (e) {
                console.error('User lookup failed', e);
            }
        }

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
            const userInfo = userMap.get(c.userId?.toString() || '') || {} as any;
            return {
                id: c._id.toString(),
                userId: c.userId?.toString() || '-',
                userName: userInfo.name || userInfo.username || 'Unknown',
                userPhone: userInfo.phone || null,
                userAddress: userInfo.address || null,
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
