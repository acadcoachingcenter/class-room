# ACAD Classroom Notify

A small Cloudflare Worker that:

1. **On class schedule/update** — creates or updates a Google Calendar event
   for the class, auto-generates a Google Meet link, adds the tutor and
   students as attendees (Calendar emails them the invite automatically),
   and additionally sends an ACAD-branded confirmation email via Gmail.
2. **On a 5-minute cron** — finds classes starting within 15 minutes and
   emails a "starting soon" reminder to everyone on the event, once each.

Your ACAD database stays the source of truth (class/tutor/student records).
This worker is stateless integration glue — it doesn't store class data
itself, only a small dedupe record per event so reminders aren't sent twice.

## One-time Google Cloud setup

1. In Google Cloud Console, create/select a project and enable:
   - **Google Calendar API**
   - **Gmail API**
2. Create a **service account** (IAM & Admin → Service Accounts). Download
   its JSON key — you'll paste this into a Worker secret, never commit it.
3. In your **Google Workspace Admin console** → Security → API Controls →
   Domain-wide Delegation, add the service account's **Client ID** with
   these OAuth scopes:
   ```
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/gmail.send
   ```
   This lets the service account act *as* a specific mailbox (set below),
   rather than needing every tutor/student to individually grant OAuth
   consent.
4. Decide which mailbox the service account will impersonate — e.g. a
   dedicated `no-reply@acadapp.in` (recommended) or an admin account. This
   is `GOOGLE_IMPERSONATE_EMAIL`.
5. Create a Calendar dedicated to ACAD classes (in that mailbox's Google
   Calendar), share it appropriately, and copy its **Calendar ID** (Calendar
   Settings → Integrate calendar) — this is `ACAD_CALENDAR_ID`.

If you're not on Google Workspace (i.e. using plain @gmail.com accounts),
domain-wide delegation isn't available — you'd instead need each tutor to
OAuth-connect their own Calendar via a normal OAuth consent flow, which is a
larger change. Flag this if that's your setup and we'll adjust the auth
approach.

## Deploy

```bash
cd server
npm install
npx wrangler kv namespace create NOTIFIED_EVENTS
# paste the returned id into wrangler.toml under [[kv_namespaces]]

npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# paste the full contents of the downloaded service account JSON key

npx wrangler secret put GOOGLE_IMPERSONATE_EMAIL
# e.g. no-reply@acadapp.in

# edit wrangler.toml [vars] ACAD_CALENDAR_ID to your calendar's ID

npx wrangler deploy
```

## Wiring it into ACAD

When a class is created or its schedule changes in your main ACAD backend,
call:

```
POST https://acad-classroom-notify.<your-subdomain>.workers.dev/api/calendar/sync
Content-Type: application/json

{
  "classId": "cls-001",
  "subject": "Mathematics",
  "batchName": "Grade 8 - Batch A",
  "tutor": { "name": "Mr. Kumar", "email": "kumar@acadapp.in" },
  "students": [
    { "name": "Aditi R.", "email": "aditi@example.com" }
  ],
  "startTime": "2026-08-06T18:00:00+05:30",
  "endTime": "2026-08-06T19:00:00+05:30"
}
```

Response:

```json
{
  "eventId": "...",
  "meetUrl": "https://meet.google.com/xxx-xxxx-xxx",
  "calendarLink": "https://calendar.google.com/...",
  "notified": 2,
  "notifyFailures": 0
}
```

Store `meetUrl` back on the class record in ACAD's DB (replacing the manual
"set Meet link" step from V1 — tutors no longer need to paste one at all,
though the frontend can still keep the manual field as a fallback/override).

## Securing this worker

Right now `/api/calendar/sync` is unauthenticated and CORS is wide open
(`*`). Before going live:

- Restrict `Access-Control-Allow-Origin` in `src/index.js` to your actual
  ACAD frontend domain(s).
- Add a shared-secret header (or better, a short-lived signed token) that
  ACAD's backend sends and this worker verifies, so random requests can't
  create Calendar events / send email as your Workspace account. There's a
  `TODO` marking exactly where to add this check in `src/index.js`.

## What's intentionally not built yet

- **Friday auto-labeled "Revision / Weekly Test"** — this is a scheduling
  rule that belongs in ACAD's own timetable logic (deciding *what* to sync),
  not in this notification worker (which just syncs *whatever* it's given).
- **Role-based Live Classes page inside acadapp.in** (the main dashboard, as
  distinct from classroom.acadapp.in) — separate frontend, not built here.
- **Removing the classroom app's local role selector** in favor of an
  identity passed securely from acadapp.in — needs that main-app integration
  decided first (signed token? shared session cookie?).
