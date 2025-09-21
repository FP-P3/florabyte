import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { db } from "@/db/config/mongodb";

export async function DELETE(req: NextRequest) {
  try {
    console.log("=== UNBIND GOOGLE API CALLED ===");

    // Check if user is authenticated via custom auth
    const authCookie = req.cookies.get("Authorization")?.value;
    console.log("Auth cookie:", authCookie ? "Present" : "Missing");

    if (!authCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse "Bearer <token>"
    const [type, token] = authCookie.split(" ");
    if (type !== "Bearer" || !token) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };
    const currentUserId = decoded.id;
    console.log("Current user ID from token:", currentUserId);

    // Check if current user exists
    const currentUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(currentUserId) });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has Google account linked
    if (!currentUser.googleId) {
      return NextResponse.json(
        {
          error: "No Google account is currently linked to this user",
        },
        { status: 400 }
      );
    }

    // Unbind Google account from current user
    await db.collection("users").updateOne(
      { _id: new ObjectId(currentUserId) },
      {
        $set: {
          googleId: null,
          googleEmail: null,
          // Keep profilePicture or set to null based on preference
          profilePicture: null,
          updatedAt: new Date(),
        },
      }
    );

    // Get updated user data (exclude password)
    const updatedUser = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(currentUserId) },
        { projection: { password: 0 } }
      );

    console.log("Google account successfully unbound for user:", currentUserId);

    return NextResponse.json({
      success: true,
      message: "Google account successfully unlinked",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error unbinding Google account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
