export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import CartModel from "@/db/model/CartModel";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";
import * as midtransClient from "midtrans-client"; // ESM namespace import

interface CartItemUI {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

interface MidtransItemParam {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure user profile has phone and address before allowing payment
    interface UserContact {
      phone?: string | null;
      address?: string | null;
      name?: string;
    }
    const user = await db
      .collection<UserContact>("users")
      .findOne(
        { _id: new ObjectId(userId) },
        { projection: { phone: 1, address: 1, name: 1 } }
      );
    const phone = (
      typeof user?.phone === "string"
        ? user.phone
        : user?.phone
        ? String(user.phone)
        : ""
    ).trim();
    const address = (
      typeof user?.address === "string"
        ? user.address
        : user?.address
        ? String(user.address)
        : ""
    ).trim();
    if (!phone || !address) {
      return NextResponse.json(
        {
          message:
            "Lengkapi profil terlebih dahulu: nomor telepon dan alamat wajib diisi.",
        },
        { status: 400 }
      );
    }

    const cart = await CartModel.getPendingWithProducts(userId);
    if (!cart.items.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const orderId = `FLB-${Date.now()}-${userId.slice(-6)}`;

    // Sanitize items -> integer rupiah, qty >= 1
    const items: MidtransItemParam[] = (cart.items as CartItemUI[]).map(
      (it) => ({
        id: String(it.productId),
        name: it.name || "Item",
        price: Math.round(it.price || 0),
        quantity: Math.max(1, it.qty || 1),
      })
    );

    const grossAmount = items.reduce(
      (sum: number, i) => sum + i.price * i.quantity,
      0
    );

    type SnapCtorType = new (opts: Record<string, unknown>) => {
      createTransaction: (p: unknown) => Promise<{ token: string }>;
    };
    const SnapCtor = (midtransClient as unknown as { Snap: SnapCtorType }).Snap;
    const snap = new SnapCtor({
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
    const message = err instanceof Error ? err.message : "Error";
    console.error("create payment error:", err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
