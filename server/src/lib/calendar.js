// Google Calendar integration.
//
// One event per (classId, occurrence). We store our own classId in the
// event's extendedProperties so a later sync can find and update the same
// event instead of creating duplicates.
//
// Adding tutor + students as attendees with sendUpdates: "all" makes Google
// Calendar automatically email them an invite (and, later, its own
// reminder) - this is the most reliable "gmail notification" path since it's
// Google's own delivery, not ours. The Gmail service in gmail.js is for the
// *additional* ACAD-branded emails (schedule confirmation, "starting soon"),
// on top of Calendar's native invite.

import { getGoogleAccessToken, SCOPES } from "./googleAuth";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function eventBodyForClass(classData) {
  const { classId, subject, batchName, tutor, students, startTime, endTime } = classData;

  return {
    summary: `${subject} - ${batchName}`,
    description: `ACAD live class.\nTutor: ${tutor.name}\nBatch: ${batchName}`,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
    attendees: [
      { email: tutor.email, displayName: tutor.name, responseStatus: "accepted" },
      ...students.map((s) => ({ email: s.email, displayName: s.name })),
    ],
    conferenceData: {
      createRequest: {
        requestId: `${classId}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    extendedProperties: {
      private: { acadClassId: classId },
    },
    // Calendar's own default reminders (in addition to our custom email below)
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 10 }],
    },
  };
}

async function findExistingEventId(env, calendarId, classId) {
  const token = await getGoogleAccessToken(env, [SCOPES.CALENDAR]);
  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("privateExtendedProperty", `acadClassId=${classId}`);
  url.searchParams.set("maxResults", "1");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Calendar lookup failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.items?.[0]?.id || null;
}

/**
 * Create or update the Calendar event for a class, returning the Meet link.
 * @param {object} env - Worker env bindings (secrets)
 * @param {string} calendarId - target Calendar ID (e.g. "primary" or a shared ACAD calendar)
 * @param {object} classData - { classId, subject, batchName, tutor:{name,email}, students:[{name,email}], startTime, endTime }
 */
export async function syncClassEvent(env, calendarId, classData) {
  const token = await getGoogleAccessToken(env, [SCOPES.CALENDAR]);
  const existingId = await findExistingEventId(env, calendarId, classData.classId);
  const body = eventBodyForClass(classData);

  const path = existingId
    ? `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${existingId}`
    : `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await fetch(`${path}?conferenceDataVersion=1&sendUpdates=all`, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Calendar sync failed (${res.status}): ${await res.text()}`);
  const event = await res.json();

  const meetUrl =
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || null;

  return { eventId: event.id, meetUrl, htmlLink: event.htmlLink };
}

/**
 * List events starting within the next `windowMinutes` - used by the cron
 * reminder job. Returns raw Calendar event objects.
 */
export async function listEventsStartingSoon(env, calendarId, windowMinutes = 15) {
  const token = await getGoogleAccessToken(env, [SCOPES.CALENDAR]);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMinutes * 60000);

  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", windowEnd.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  // Note: relies on `calendarId` being a calendar dedicated to ACAD classes
  // (e.g. a shared "ACAD Live Classes" calendar), so every event in range is
  // ours. Google's API doesn't support wildcard extendedProperty filters, so
  // if events from other calendars/programs ever share this calendar, add an
  // explicit tag check on event.extendedProperties.private.acadClassId when
  // processing results below.

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Calendar list failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}
