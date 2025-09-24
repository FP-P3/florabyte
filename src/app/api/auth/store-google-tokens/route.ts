import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  interface GoogleSessionTokens { access_token?: string; refresh_token?: string; expires_at?: number }
  const tokens: GoogleSessionTokens = session as unknown as GoogleSessionTokens;
  const access_token = tokens.access_token;
  const refresh_token = tokens.refresh_token;
  const expires_at = tokens.expires_at;

    if (!access_token && !refresh_token) {
      return NextResponse.json(
        { error: "No Google tokens in session" },
        { status: 400 }
      );
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          googleAccessToken: access_token,
          googleRefreshToken: refresh_token,
          googleTokenExpires: expires_at,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
