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

    // Ensure user profile has phone and address before allowing payment
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) }, { projection: { phone: 1, address: 1, name: 1 } });
    const phone = (user as any)?.phone?.toString?.().trim?.() || "";
    const address = (user as any)?.address?.toString?.().trim?.() || "";
    if (!phone || !address) {
      return NextResponse.json(
        { message: "Lengkapi profil terlebih dahulu: nomor telepon dan alamat wajib diisi." },
        { status: 400 }
      );
    }

    const cart = await CartModel.getPendingWithProducts(userId);
    if (!cart.items.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const orderId = `FLB-${Date.now()}-${userId.slice(-6)}`;

    // Sanitize items -> integer rupiah, qty >= 1
    const items = cart.items.map((it: any) => ({
      id: String(it.productId),
      name: String(it.name || "Item"),
      price: Math.round(Number(it.price) || 0),
      quantity: Math.max(1, Number(it.qty) || 1),
    }));

    // Opsional: ongkir/discount sebagai item terpisah jika ada
    const shippingFee = Math.round(Number((cart as any).shippingFee || 0));
    if (shippingFee > 0)
      items.push({
        id: "shipping",
        name: "Shipping Fee",
        price: shippingFee,
        quantity: 1,
      });
    const discount = Math.round(Number((cart as any).discount || 0));
    if (discount > 0)
      items.push({
        id: "discount",
        name: "Discount",
        price: -discount,
        quantity: 1,
      });

    const grossAmount = items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );

    const snap = new (midtransClient as any).Snap({
      isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    });

    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      item_details: items,
      credit_card: { secure: true },
    };

    const trx = await snap.createTransaction(parameter);

    await db
      .collection("cart")
      .updateOne(
        { userId: new ObjectId(userId), status: "pending" },
        { $set: { midtransOrderId: orderId, total: grossAmount } }
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
