// Classroom API layer.
//
// Every function here currently reads/writes the in-memory mock store in
// mockData.js, EXCEPT syncClassToCalendar, which calls the real
// google-calendar-notify worker (see /server) when a URL is configured.
//
// Suggested real endpoints for the rest of this file, once the main ACAD
// backend exists:
//   GET  /api/classrooms?userId=...        -> listClassesForUser
//   GET  /api/classrooms/:id               -> getClass
//   PATCH /api/classrooms/:id/meet-url     -> updateMeetUrl
//   GET  /api/classrooms/:id/resources     -> (future) getResources
//   POST /api/classrooms/:id/resources     -> (future) uploadResource

import * as mock from "./mockData";

// Set VITE_NOTIFY_WORKER_URL in a .env file once the worker is deployed,
// e.g. VITE_NOTIFY_WORKER_URL=https://acad-classroom-notify.xxx.workers.dev
const NOTIFY_WORKER_URL = import.meta.env.VITE_NOTIFY_WORKER_URL || "";

export async function listClassesForUser(user) {
  return mock.listClassesForUser(user);
}

export async function getClass(classId) {
  return mock.getClass(classId);
}

export async function updateMeetUrl(classId, meetUrl) {
  return mock.updateMeetUrl(classId, meetUrl);
}

/**
 * Push a class's schedule to Google Calendar, auto-generate its Meet link,
 * and trigger tutor/student email notifications. Falls back to a mock
 * response (a fake Meet link, no real emails) when NOTIFY_WORKER_URL isn't
 * configured yet, so the UI stays demoable without the backend deployed.
 */
export async function syncClassToCalendar(classItem, { tutorEmail, studentEmails = [] } = {}) {
  if (!NOTIFY_WORKER_URL) {
    // Mock fallback - no real Calendar/Gmail calls until the worker is deployed.
    const meetUrl = classItem.meetUrl || "https://meet.google.com/demo-not-deployed";
    const updated = await mock.updateMeetUrl(classItem.id, meetUrl);
    return {
      meetUrl,
      eventId: "mock-event",
      notified: studentEmails.length + 1,
      notifyFailures: 0,
      mocked: true,
      classItem: updated,
    };
  }

  const res = await fetch(`${NOTIFY_WORKER_URL}/api/calendar/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId: classItem.id,
      subject: classItem.subject,
      batchName: classItem.batchName,
      tutor: { name: classItem.tutorName, email: tutorEmail },
      students: studentEmails.map((email, i) => ({ name: `Student ${i + 1}`, email })),
      startTime: classItem.schedule.startTimeISO,
      endTime: classItem.schedule.endTimeISO,
    }),
  });

  if (!res.ok) throw new Error(`Calendar sync failed: ${await res.text()}`);
  const data = await res.json();
  const updated = await mock.updateMeetUrl(classItem.id, data.meetUrl);
  return { ...data, mocked: false, classItem: updated };
}

export function classStatus(classItem) {
  // Placeholder status logic based on schedule.label until real datetimes
  // come from the backend. Once schedule has real start/end ISO timestamps,
  // replace with an actual time-window comparison.
  if (!classItem.schedule?.label) return "upcoming";
  if (classItem.schedule.label.toLowerCase() === "today") return "live-soon";
  return "upcoming";
}
