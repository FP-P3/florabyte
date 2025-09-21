import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/config/mongodb";
import { CalendarEventModel } from "@/db/models/calendarEventModel";
import { createRecurringEvent } from "@/lib/googleCalendar";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Parse JSON body safely
    type Body = { plantId?: string; type?: string; notes?: string } | null;
    let body: Body = null;
    try {
      body = await req.json();
    } catch {
      // ignore, we'll handle as invalid body
    }
    const plantId = body?.plantId as string | undefined;
    const type = body?.type as string | undefined;
    const notes = (body?.notes as string | undefined) ?? "";
    if (!plantId || !type) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Get user tokens from DB
    const user = await db
      .collection("users")
      .findOne({ _id: new (await import("mongodb")).ObjectId(userId) });
    if (!user?.googleRefreshToken && !user?.googleAccessToken) {
      return NextResponse.json({ error: "Google not linked" }, { status: 400 });
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const iso = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}:00`;

    const event = await createRecurringEvent(
      {
        accessToken: user.googleAccessToken,
        refreshToken: user.googleRefreshToken,
        expiresAt: user.googleTokenExpires,
      },
      {
        summary: `${type[0].toUpperCase()}${type.slice(1)} Plant Care`,
        description: notes || "Added from Florabyte",
        startISO: iso(start),
        endISO: iso(end),
        timeZone: tz,
        recurrence: ["RRULE:FREQ=DAILY;INTERVAL=7"],
      }
    );

    if (!event.id)
      return NextResponse.json(
        { error: "Failed to create event" },
        { status: 500 }
      );

    await CalendarEventModel.addEvent({
      userId,
      plantId,
      calendarId: "primary",
      eventId: event.id,
      type,
      recurrence: ["RRULE:FREQ=DAILY;INTERVAL=7"],
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
