import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import OrderModel from "@/db/model/OrderModel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authCookie = req.cookies.get("Authorization")?.value;
    if (!authCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [type, token] = authCookie.split(" ");
    if (type !== "Bearer" || !token) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const history = await OrderModel.getHistory(decoded.id, 50);
    return NextResponse.json({ orders: history });
  } catch (err) {
    console.error("Get orders error:", err);
    return NextResponse.json({ error: "Failed fetching orders" }, { status: 500 });
  }
}
