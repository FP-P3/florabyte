export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/config/mongodb";
const midtransClient = require("midtrans-client");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    console.log("Midtrans notif body:", body);

    const orderId = body?.order_id || body?.orderId;
    // Jika ini test button (order_id dummy) atau kosong → balas OK saja
    if (!orderId || String(orderId).startsWith("payment_notif_test_")) {
      return NextResponse.json({ ok: true });
    }

    const core = new midtransClient.CoreApi({
      isProduction:
        (process.env.MIDTRANS_IS_PRODUCTION ??
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION) === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    // Ambil status transaksi; coba notification lalu fallback ke status
    let status;
    try {
      status = await core.transaction.notification(body);
    } catch {
      status = await core.transaction.status(orderId);
    }
    console.log("Midtrans status:", status);

    const trx = status.transaction_status as string;
    const fraud = status.fraud_status as string | undefined;

    let newStatus: "paid" | "cancelled" | "pending" = "pending";
    if ((trx === "capture" && fraud === "accept") || trx === "settlement")
      newStatus = "paid";
    else if (["deny", "cancel", "expire"].includes(trx))
      newStatus = "cancelled";

    const res = await db
      .collection("cart")
      .updateOne({ midtransOrderId: orderId }, { $set: { status: newStatus } });
    console.log("Cart update modified:", res.modifiedCount);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Midtrans notif error:", err);
    // Balas 200 agar Midtrans tidak retry terus saat sandbox test
    return NextResponse.json({ ok: true });
  }
}
