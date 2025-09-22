import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { db } from "@/db/config/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const access_token = (session as any)?.access_token as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refresh_token = (session as any)?.refresh_token as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expires_at = (session as any)?.expires_at as number | undefined;

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
