export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch seconds
};

export async function getAuthorizedCalendar(tokens: GoogleTokens) {
  const { google } = await import("googleapis");
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000"
  );
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt ? tokens.expiresAt * 1000 : undefined,
  });

  // Refresh if expired
  if (
    tokens.expiresAt &&
    Date.now() / 1000 >= tokens.expiresAt - 60 &&
    tokens.refreshToken
  ) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createRecurringEvent(
  tokens: GoogleTokens,
  params: {
    summary: string;
    description?: string;
    startISO: string; // e.g., 2025-09-21T09:00:00
    endISO: string; // e.g., 2025-09-21T10:00:00
    timeZone: string;
    recurrence: string[]; // e.g., ["RRULE:FREQ=DAILY;INTERVAL=7"]
  }
) {
  const calendar = await getAuthorizedCalendar(tokens);
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startISO, timeZone: params.timeZone },
      end: { dateTime: params.endISO, timeZone: params.timeZone },
      recurrence: params.recurrence,
    },
  });
  return res.data; // contains id
}

export async function deleteEvent(
  tokens: GoogleTokens,
  eventId: string,
  calendarId = "primary"
) {
  const calendar = await getAuthorizedCalendar(tokens);
  await calendar.events.delete({ calendarId, eventId });
}
