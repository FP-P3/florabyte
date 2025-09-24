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

    // Ensure cart has recipient info before allowing payment
    const cartDoc = await db
      .collection("cart")
      .findOne({ userId: new ObjectId(userId), status: "pending" }, { projection: { recipientName: 1, recipientPhone: 1, recipientAddress: 1 } });
    const rName = (cartDoc as { recipientName?: unknown } | null)?.recipientName as string | undefined;
    const rPhone = (cartDoc as { recipientPhone?: unknown } | null)?.recipientPhone as string | undefined;
    const rAddr = (cartDoc as { recipientAddress?: unknown } | null)?.recipientAddress as string | undefined;
    if (!rName || !rName.trim() || !rPhone || !rPhone.trim() || !rAddr || !rAddr.trim()) {
      return NextResponse.json(
        { message: "Lengkapi data penerima (nama, telepon, alamat) terlebih dahulu." },
        { status: 400 }
      );
    }

    const cart = await CartModel.getPendingWithProducts(userId);
    if (!cart.items.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const orderId = `FLB-${Date.now()}-${userId.slice(-6)}`;

    // Sanitize items -> integer rupiah, qty >= 1
    type CartItem = { productId: string; name: string; price: number; imgUrl: string; qty: number };
    const items = (cart.items as CartItem[]).map((it) => ({
      id: String(it.productId),
      name: String(it.name || "Item"),
      price: Math.round(Number(it.price) || 0),
      quantity: Math.max(1, Number(it.qty) || 1),
    }));

    // Opsional: ongkir/discount sebagai item terpisah jika ada
    const shippingFee = Math.round(Number((cart as { shippingFee?: number } & object).shippingFee || 0));
    if (shippingFee > 0)
      items.push({
        id: "shipping",
        name: "Shipping Fee",
        price: shippingFee,
        quantity: 1,
      });
    const discount = Math.round(Number((cart as { discount?: number } & object).discount || 0));
    if (discount > 0)
      items.push({
        id: "discount",
        name: "Discount",
        price: -discount,
        quantity: 1,
      });

    const grossAmount = items.reduce(
      (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
      0
    );

    const snap = new (midtransClient as unknown as { Snap: new (cfg: { isProduction: boolean; serverKey?: string; clientKey?: string }) => { createTransaction: (p: unknown) => Promise<{ token: string }> } }).Snap({
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
  } catch (err: unknown) {
    console.error("create payment error:", err);
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
