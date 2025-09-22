export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import CartModel from "@/db/model/CartModel";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";
import * as midtransClient from "midtrans-client"; // ESM namespace import

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const cart = await CartModel.getPendingWithProducts(userId);
    if (!cart.items.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const orderId = `FLB-${Date.now()}-${userId.slice(-6)}`;

    const snap = new midtransClient.Snap({
      isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: cart.total,
      },
      item_details: cart.items.map((it) => ({
        id: it.productId,
        price: it.price,
        quantity: it.qty,
        name: it.name,
      })),
      credit_card: { secure: true },
    };

    const trx = await snap.createTransaction(parameter);

    await db
      .collection("cart")
      .updateOne(
        { userId: new ObjectId(userId), status: "pending" },
        { $set: { midtransOrderId: orderId } }
      );

    return NextResponse.json({ token: trx.token, orderId });
  } catch (err: any) {
    console.error("create payment error:", err);
    return NextResponse.json(
      { message: err?.message || "Error" },
      { status: 500 }
    );
  }
}
