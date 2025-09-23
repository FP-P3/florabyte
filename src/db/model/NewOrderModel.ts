import { ObjectId } from "mongodb";
import { db } from "../config/mongodb";

export type LogisticsOrderStatus =
    | "Pending"
    | "Diproses"
    | "Dikirim"
    | "Selesai"
    | "Dibatalkan";

export interface OrderItemSnapshot {
    productId: string; // reference id
    name: string; // snapshot name
    price: number; // snapshot single price at purchase time
    qty: number;
}

export interface OrderDocument {
    _id?: ObjectId;
    userId: ObjectId;
    items: OrderItemSnapshot[];
    total: number;
    status: LogisticsOrderStatus;
    paymentStatus: "pending" | "paid" | "cancelled";
    midtransOrderId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicOrderDTO {
    id: string;
    userId: string;
    items: OrderItemSnapshot[];
    total: number;
    status: LogisticsOrderStatus;
    paymentStatus: "pending" | "paid" | "cancelled";
    midtransOrderId?: string;
    createdAt: string;
    updatedAt: string;
}

function mapDoc(doc: OrderDocument): PublicOrderDTO {
    return {
        id: (doc._id as ObjectId).toString(),
        userId: doc.userId.toString(),
        items: doc.items,
        total: doc.total,
        status: doc.status,
        paymentStatus: doc.paymentStatus,
        midtransOrderId: doc.midtransOrderId,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

export default class NewOrderModel {
    static collection() {
        return db.collection<OrderDocument>("orders");
    }

    static async createFromCart(params: {
        userId: string;
        cartProductIds: ObjectId[]; // list with duplicates representing qty
        midtransOrderId?: string;
    }) {
        const { userId, cartProductIds, midtransOrderId } = params;
        if (!ObjectId.isValid(userId)) throw new Error("Invalid userId");
        const userObjectId = new ObjectId(userId);

        // aggregate qty
        const qtyById: Record<string, number> = {};
        for (const pid of cartProductIds) {
            const key = pid.toString();
            qtyById[key] = (qtyById[key] || 0) + 1;
        }
        const uniqueIds = Object.keys(qtyById).map((id) => new ObjectId(id));

        const products = await db
            .collection("Products")
            .find({ _id: { $in: uniqueIds } })
            .project({ name: 1, price: 1 })
            .toArray();

        const productMap = new Map<string, { name: string; price: number }>();
        for (const p of products) {
            productMap.set(p._id.toString(), {
                name: (p as any).name || "Unknown",
                price: Number((p as any).price) || 0,
            });
        }

        const items: OrderItemSnapshot[] = Object.entries(qtyById).map(
            ([pid, qty]) => {
                const meta = productMap.get(pid) || { name: "Unknown", price: 0 };
                return {
                    productId: pid,
                    name: meta.name,
                    price: meta.price,
                    qty,
                };
            }
        );

        const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
        const now = new Date();
        const doc: OrderDocument = {
            userId: userObjectId,
            items,
            total,
            status: "Pending",
            paymentStatus: "paid", // created only after payment success currently
            midtransOrderId,
            createdAt: now,
            updatedAt: now,
        };
        const res = await this.collection().insertOne(doc);
        return { id: res.insertedId.toString() };
    }

    static async getByUser(userId: string, limit = 50): Promise<PublicOrderDTO[]> {
        if (!ObjectId.isValid(userId)) return [];
        const cursor = this.collection()
            .find({ userId: new ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(limit);
        const docs = await cursor.toArray();
        return docs.map(mapDoc);
    }

    static async getAll(limit = 200): Promise<PublicOrderDTO[]> {
        const docs = await this.collection()
            .find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
        return docs.map(mapDoc);
    }

    static async updateStatus(orderId: string, status: LogisticsOrderStatus) {
        if (!ObjectId.isValid(orderId)) throw new Error("Invalid orderId");
        const valid: LogisticsOrderStatus[] = [
            "Pending",
            "Diproses",
            "Dikirim",
            "Selesai",
            "Dibatalkan",
        ];
        if (!valid.includes(status)) throw new Error("Status tidak valid");

        const result = await this.collection().findOneAndUpdate(
            { _id: new ObjectId(orderId) },
            { $set: { status, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        const updated = (result as any)?.value as OrderDocument | undefined;
        if (!updated) throw new Error("Order tidak ditemukan");
        return mapDoc(updated);
    }
}
