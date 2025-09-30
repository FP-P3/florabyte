import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db/config/mongodb";
import GoogleProvider from "next-auth/providers/google";

// Buat ulang authOptions di sini jika tidak bisa import
const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_API_KEY!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.JWT_SECRET!,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db
    .collection("users")
    .findOne({ googleEmail: session.user.email });

  return NextResponse.json(user);
}
