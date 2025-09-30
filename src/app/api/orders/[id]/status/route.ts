import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";

export type LogisticsOrderStatus =
  | "Pending"
  | "Diproses"
  | "Dikirim"
  | "Selesai"
  | "Dibatalkan";

export const runtime = "nodejs";

// PATCH /api/orders/[id]/status  (Admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const rawParams = (
      context as
        | { params: { id: string } }
        | { params: Promise<{ id: string }> }
    ).params;
    const resolvedParams = (rawParams as Promise<{ id: string }>).then
      ? await (rawParams as Promise<{ id: string }>)
      : (rawParams as { id: string });
    const orderId = resolvedParams.id;

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
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();
    if (!status)
      return NextResponse.json({ error: "Status required" }, { status: 400 });

    if (!ObjectId.isValid(orderId))
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const valid: LogisticsOrderStatus[] = [
      "Pending",
      "Diproses",
      "Dikirim",
      "Selesai",
      "Dibatalkan",
    ];
    if (!valid.includes(status as LogisticsOrderStatus))
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    // Ambil cart dulu untuk validasi state
    const cart = await db
      .collection("cart")
      .findOne({ _id: new ObjectId(orderId) });
    if (!cart)
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    if (cart.status === "pending")
      return NextResponse.json(
        { error: "Belum bisa ubah status: pembayaran masih pending" },
        { status: 409 }
      );
    if (cart.status === "cancelled")
      return NextResponse.json(
        { error: "Tidak bisa ubah: pembayaran dibatalkan" },
        { status: 409 }
      );

    // Jika status sama, jangan lakukan perubahan; kembalikan existing agar response konsisten
    if (cart.orderStatus === status) {
      return NextResponse.json({
        order: {
          id: cart._id.toString(),
          status: cart.orderStatus,
          paymentStatus: cart.status === "paid" ? "paid" : "cancelled",
          unchanged: true,
        },
      });
    }

    const upd = await db
      .collection("cart")
      .updateOne({ _id: cart._id }, { $set: { orderStatus: status } });
    if (upd.matchedCount === 0) {
      return NextResponse.json(
        { error: "Order tidak ditemukan (pas update)" },
        { status: 404 }
      );
    }
    if (upd.modifiedCount === 0) {
      // Race: status sama atau write concern skip
      return NextResponse.json({
        order: {
          id: cart._id.toString(),
          status: cart.orderStatus,
          paymentStatus: cart.status === "paid" ? "paid" : "cancelled",
          unchanged: true,
        },
      });
    }
    const updated = await db.collection("cart").findOne({ _id: cart._id });
    if (!updated) {
      console.warn("Update orderStatus: setelah update tidak ditemukan", {
        orderId,
        statusBaru: status,
        upd,
      });
      return NextResponse.json(
        { error: "Order menghilang setelah update" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      order: {
        id: updated._id.toString(),
        status: updated.orderStatus,
        paymentStatus: updated.status === "paid" ? "paid" : "cancelled",
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && /Order tidak ditemukan/i.test(err.message))
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    console.error("PATCH /api/orders/[id]/status error", err);
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
