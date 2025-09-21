import { NextRequest, NextResponse } from "next/server";
import { CalendarEventModel } from "@/db/models/calendarEventModel";
import { db } from "@/db/config/mongodb";
import { deleteEvent } from "@/lib/googleCalendar";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plantId } = await req.json();
    if (!plantId)
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const user = await db
      .collection("users")
      .findOne({ _id: new (await import("mongodb")).ObjectId(userId) });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const events = await CalendarEventModel.findByPlant(userId, plantId);
    if (events.length === 0)
      return NextResponse.json({ success: true, deleted: 0 });

    // Attempt to delete all events
    let deleted = 0;
    for (const ev of events) {
      try {
        await deleteEvent(
          {
            accessToken: user.googleAccessToken,
            refreshToken: user.googleRefreshToken,
            expiresAt: user.googleTokenExpires,
          },
          ev.eventId,
          ev.calendarId
        );
        deleted++;
      } catch (err) {
        console.warn("Failed to delete calendar event", ev.eventId, err);
      }
    }

    // Remove from DB regardless
    await CalendarEventModel.deleteByPlant(userId, plantId);

    return NextResponse.json({ success: true, deleted });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
