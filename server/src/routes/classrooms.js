import { syncClassEvent } from "../lib/calendar";
import { sendEmailToMany } from "../lib/gmail";
import { classScheduledEmail } from "../lib/emailTemplates";

/**
 * POST /api/calendar/sync
 * Body: {
 *   classId, subject, batchName,
 *   tutor: { name, email },
 *   students: [{ name, email }],
 *   startTime, endTime   // ISO 8601, e.g. "2026-08-06T18:00:00+05:30"
 * }
 *
 * ACAD's own DB is the source of truth for this data - this endpoint is
 * called after a class is created/rescheduled there. It does not read or
 * write anything except Google Calendar + Gmail, and returns the generated
 * Meet link for ACAD to store back on the class record.
 */
export async function handleCalendarSync(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const required = ["classId", "subject", "batchName", "tutor", "students", "startTime", "endTime"];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) {
    return jsonResponse({ error: `Missing fields: ${missing.join(", ")}` }, 400);
  }

  const calendarId = env.ACAD_CALENDAR_ID || "primary";

  let syncResult;
  try {
    syncResult = await syncClassEvent(env, calendarId, body);
  } catch (err) {
    return jsonResponse({ error: `Calendar sync failed: ${err.message}` }, 502);
  }

  // Calendar's own attendee invite already went out (sendUpdates: "all").
  // This ACAD-branded email is an additional, friendlier confirmation.
  const recipients = [
    { name: body.tutor.name, email: body.tutor.email },
    ...body.students,
  ];

  const emailResults = await Promise.allSettled(
    recipients.map((r) => {
      const { subject, html } = classScheduledEmail({
        recipientName: r.name,
        subject: body.subject,
        batchName: body.batchName,
        tutorName: body.tutor.name,
        startTime: body.startTime,
        endTime: body.endTime,
        meetUrl: syncResult.meetUrl,
      });
      return sendEmailToMany(env, [r.email], { subject, html });
    })
  );

  const failedEmails = emailResults.filter((r) => r.status === "rejected").length;

  return jsonResponse({
    eventId: syncResult.eventId,
    meetUrl: syncResult.meetUrl,
    calendarLink: syncResult.htmlLink,
    notified: recipients.length - failedEmails,
    notifyFailures: failedEmails,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
