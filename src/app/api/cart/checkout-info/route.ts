import { NextRequest, NextResponse } from "next/server";
import CartModel from "@/db/model/CartModel";

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await req.json()) as {
            recipientName?: string;
            recipientPhone?: string;
            recipientAddress?: string;
        };
        const info = {
            recipientName: (body.recipientName ?? "").toString(),
            recipientPhone: (body.recipientPhone ?? "").toString(),
            recipientAddress: (body.recipientAddress ?? "").toString(),
        };
        await CartModel.setCheckoutInfo(userId, info);
        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
