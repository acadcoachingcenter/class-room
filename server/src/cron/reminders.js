import { listEventsStartingSoon } from "../lib/calendar";
import { sendEmail } from "../lib/gmail";
import { classStartingSoonEmail } from "../lib/emailTemplates";

const REMINDER_WINDOW_MINUTES = 15;
const KV_TTL_SECONDS = 60 * 60 * 2; // dedupe key expires well after the class ends

/**
 * Runs on the cron schedule defined in wrangler.toml (e.g. every 5 minutes).
 * Finds events starting within REMINDER_WINDOW_MINUTES and emails every
 * attendee once, using KV to avoid double-sends across overlapping runs.
 *
 * Requires a KV namespace bound as env.NOTIFIED_EVENTS (see wrangler.toml).
 */
export async function handleReminderCron(env) {
  const calendarId = env.ACAD_CALENDAR_ID || "primary";
  const events = await listEventsStartingSoon(env, calendarId, REMINDER_WINDOW_MINUTES);

  for (const event of events) {
    const alreadyNotified = await env.NOTIFIED_EVENTS.get(event.id);
    if (alreadyNotified) continue;

    const startTime = new Date(event.start.dateTime || event.start.date);
    const minutesUntilStart = Math.max(1, Math.round((startTime - new Date()) / 60000));
    const meetUrl = event.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video"
    )?.uri;

    if (!meetUrl) continue; // nothing useful to send yet

    const [subject, batchName] = (event.summary || "Class").split(" - ");

    const attendees = (event.attendees || []).filter((a) => a.email);
    await Promise.allSettled(
      attendees.map((a) => {
        const { subject: emailSubject, html } = classStartingSoonEmail({
          recipientName: a.displayName || a.email,
          subject: subject || event.summary,
          batchName: batchName || "",
          minutesUntilStart,
          meetUrl,
        });
        return sendEmail(env, { to: a.email, subject: emailSubject, html });
      })
    );

    await env.NOTIFIED_EVENTS.put(event.id, "1", { expirationTtl: KV_TTL_SECONDS });
  }

  return { checked: events.length };
}
