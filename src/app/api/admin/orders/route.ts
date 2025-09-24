import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";

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

        type CartDoc = {
            _id: ObjectId;
            userId?: ObjectId;
            productIds?: ObjectId[];
            total?: number;
            status?: string;
            orderStatus?: string;
            midtransOrderId?: string;
            createdAt?: Date;
            recipientName?: string;
            recipientPhone?: string;
            recipientAddress?: string;
        };
        const carts = await db.collection<CartDoc>("cart")
            .find({ status: { $in: ["paid", "cancelled"] } })
            .sort({ createdAt: -1 })
            .limit(400)
            .toArray();

        // Build aggregated items (name + qty) from productIds
        const productIdSet = new Set<string>();
        carts.forEach(c => (c.productIds || []).forEach((p) => { if (p) productIdSet.add(p.toString()); }));
        const productDocs = await db.collection<{ _id: ObjectId; name?: string; price?: number }>("Products")
            .find({ _id: { $in: Array.from(productIdSet).map(id => new ObjectId(id)) } })
            .project({ name: 1, price: 1 })
            .toArray();
        const productMap = new Map<string, { name: string; price: number }>(
            productDocs.map((p) => [p._id.toString(), { name: p.name || 'Unknown', price: Number(p.price || 0) }])
        );

        // Collect userIds for name lookup
        const userIdSet = new Set<string>();
        carts.forEach(c => { if (c.userId) userIdSet.add(c.userId.toString()); });
        let userMap = new Map<string, { name?: string; username?: string }>();
        if (userIdSet.size) {
            try {
                const userDocs = await db.collection<{ _id: ObjectId; name?: string; username?: string }>("users")
                    .find({ _id: { $in: Array.from(userIdSet).map(id => new ObjectId(id)) } })
                    .project({ name: 1, username: 1 })
                    .toArray();
                userMap = new Map(userDocs.map((u) => [u._id.toString(), { name: u.name, username: u.username }]));
            } catch (e) {
                console.error('User lookup failed', e);
            }
        }

        const orders = carts.map((c) => {
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
            const userInfo = userMap.get(c.userId?.toString() || '') || {};
            return {
                id: c._id.toString(),
                userId: c.userId?.toString() || '-',
                userName: c.recipientName || userInfo.name || userInfo.username || 'Unknown',
                userPhone: c.recipientPhone || null,
                userAddress: c.recipientAddress || null,
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
    } catch (err: unknown) {
        console.error("GET /api/admin/orders error", err);
        const message = err instanceof Error ? err.message : "Failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
