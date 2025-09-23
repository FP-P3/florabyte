export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";
import * as midtransClient from "midtrans-client";
// tambahkan import crypto untuk verifikasi signature
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    console.log("Midtrans notif body:", body);

    // Validasi signature_key: sha512(order_id + status_code + gross_amount + serverKey)
    const orderId = body?.order_id || body?.orderId;
    const statusCode = String(body?.status_code ?? "");
    const grossAmount = String(body?.gross_amount ?? "");
    const signature = String(body?.signature_key ?? "").toLowerCase();
    const serverKey = process.env.MIDTRANS_SERVER_KEY as string;

    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY is missing");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    if (orderId && statusCode && grossAmount && signature) {
      const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
      const expectedSig = crypto.createHash("sha512").update(raw).digest("hex");
      if (expectedSig.toLowerCase() !== signature) {
        console.warn("Invalid Midtrans signature_key");
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    } else {
      // Dashboard "Test notification URL" bisa kirim payload tidak lengkap
      if (!orderId || String(orderId).startsWith("payment_notif_test_")) {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Payload test dari dashboard → tidak ada transaksi nyata
    if (String(orderId).startsWith("payment_notif_test_")) {
      return NextResponse.json({ ok: true });
    }

    const core = new midtransClient.CoreApi({
      isProduction:
        (process.env.MIDTRANS_IS_PRODUCTION ??
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION) === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

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

    const cartCollection = db.collection("cart");
    const cartDoc = await cartCollection.findOne({ midtransOrderId: orderId });

    if (cartDoc) {
      // Update legacy cart status
      await cartCollection.updateOne(
        { _id: cartDoc._id },
        {
          $set: {
            status: newStatus,
            orderStatus:
              cartDoc.orderStatus ||
              (newStatus === "paid" ? "Pending" : undefined),
          },
        }
      );

      // Kurangi stok saat pembayaran berhasil (idempotent)
      if (newStatus === "paid") {
        // Claim atomik: hanya satu kali jalankan untuk order yang sama
        const claimRes = await cartCollection.updateOne(
          { _id: cartDoc._id, inventoryAdjusted: { $ne: true } },
          { $set: { inventoryAdjusted: true, inventoryAdjustedAt: new Date() } }
        );
        const claimed =
          claimRes.matchedCount === 1 && claimRes.modifiedCount === 1;
        if (claimed) {
          // Hitung qty per productId dari array duplikat
          const qtyById: Record<string, number> = {};
          for (const oid of (cartDoc.productIds as ObjectId[] | undefined) ||
            []) {
            const key = new ObjectId(oid).toString();
            qtyById[key] = (qtyById[key] || 0) + 1;
          }

          const ops = Object.entries(qtyById).map(([id, qty]) => ({
            updateOne: {
              filter: { _id: new ObjectId(id) },
              // Pastikan stock tidak minus (pipeline update)
              update: [
                {
                  $set: {
                    stock: {
                      $max: [
                        {
                          $subtract: [
                            { $ifNull: ["$stock", 0] },
                            Math.max(1, qty),
                          ],
                        },
                        0,
                      ],
                    },
                  },
                },
              ] as any,
            },
          }));

          if (ops.length) {
            try {
              await db
                .collection("Products")
                .bulkWrite(ops, { ordered: false });
            } catch (e) {
              console.error("Adjust stock failed:", e);
            }
          }
        }
      }

      // Only create order when payment success and not migrated before
      const isPaid = newStatus === "paid";
      // Tidak lagi membuat snapshot orders collection – cukup gunakan cart + orderStatus.
    } else {
      console.warn("Cart not found for midtransOrderId", orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Midtrans notif error:", err);
    // Balas 200 agar Midtrans tidak retry terus saat sandbox test
    return NextResponse.json({ ok: true });
  }
}
