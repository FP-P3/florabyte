import { NextResponse } from "next/server";

export async function POST() {
  // Clear httpOnly Authorization cookie
  const res = NextResponse.json({ success: true });
  res.cookies.set("Authorization", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return res;
}

export async function GET() {
  // Allow GET for convenience/debug
  const res = NextResponse.json({ success: true });
  res.cookies.set("Authorization", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return res;
}
