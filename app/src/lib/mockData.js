// TEMPORARY in-memory data store standing in for the backend.
// Shape matches what classroomApi.js expects to receive from the real API.
// Swap classroomApi.js internals to real fetch() calls against the backend
// repo and this file can be deleted.

let classes = [
  {
    id: "cls-001",
    subject: "Mathematics",
    batchName: "Grade 8 - Batch A",
    tutorId: "u-tutor-1",
    tutorName: "Mr. Kumar",
    tutorEmail: "kumar@acadapp.in",
    studentIds: ["u-student-1", "u-student-2", "u-student-3"],
    studentEmails: ["aditi@example.com", "rahul@example.com", "priya@example.com"],
    schedule: {
      label: "Today",
      startTime: "18:00",
      endTime: "19:00",
      // Real ISO timestamps for the Calendar sync demo - replace "2026-08-06"
      // with actual dates once schedule comes from real batch data.
      startTimeISO: "2026-08-06T18:00:00+05:30",
      endTimeISO: "2026-08-06T19:00:00+05:30",
    },
    meetUrl: "https://meet.google.com/wsb-ztxe-kwc",
    whiteboardUrl: "https://excalidraw.com",
    resources: [
      { id: "res-1", type: "pdf", title: "Quadratic Equations - Notes", url: "#" },
      { id: "res-2", type: "image", title: "Board Snapshot - Aug 1", url: "#" },
      { id: "res-3", type: "doc", title: "Homework Sheet 4", url: "#" },
    ],
  },
  {
    id: "cls-002",
    subject: "Physics",
    batchName: "Grade 10 - Batch B",
    tutorId: "u-tutor-1",
    tutorName: "Mr. Kumar",
    tutorEmail: "kumar@acadapp.in",
    studentIds: ["u-student-1"],
    studentEmails: ["aditi@example.com"],
    schedule: {
      label: "Tomorrow",
      startTime: "17:00",
      endTime: "18:00",
      startTimeISO: "2026-08-07T17:00:00+05:30",
      endTimeISO: "2026-08-07T18:00:00+05:30",
    },
    meetUrl: "",
    whiteboardUrl: "https://excalidraw.com",
    resources: [
      { id: "res-4", type: "pdf", title: "Laws of Motion - Worksheet", url: "#" },
    ],
  },
];

// Simulate async network calls so the API surface matches a real fetch layer.
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export async function listClassesForUser(user) {
  await delay();
  if (user.role === "admin") return [...classes];
  if (user.role === "tutor") return classes.filter((c) => c.tutorId === user.id);
  return classes.filter((c) => c.studentIds.includes(user.id));
}

export async function getClass(classId) {
  await delay();
  return classes.find((c) => c.id === classId) || null;
}

export async function updateMeetUrl(classId, meetUrl) {
  await delay();
  classes = classes.map((c) => (c.id === classId ? { ...c, meetUrl } : c));
  return classes.find((c) => c.id === classId);
}
