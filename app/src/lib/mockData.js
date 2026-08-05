// TEMPORARY browser-persistent classroom data store.
//
// This keeps the classroom usable while the real ACAD API/database
// integration is being completed.
//
// Data edited by the user is saved in localStorage.
// Later, classroomApi.js can be changed to call the real ACAD backend
// and this file can be removed.

const STORAGE_KEY = "acad_classroom_classes_v2";

const defaultClasses = [
  {
    id: "cls-001",

    grade: 9,
    subject: "Mathematics",
    batchName: "Morning Batch",

    tutorId: "u-tutor-1",
    tutorName: "Tutor",
    tutorEmail: "",

    studentIds: [
      "u-student-1",
      "u-student-2",
      "u-student-3",
    ],

    studentEmails: [],

    schedule: {
      day: "Monday",
      label: "Upcoming",

      startTime: "06:00",
      endTime: "07:00",

      startTimeISO: "2026-08-10T06:00:00+05:30",
      endTimeISO: "2026-08-10T07:00:00+05:30",
    },

    meetUrl: "",

    whiteboardUrl: "https://excalidraw.com",

    resources: [],
  },

  {
    id: "cls-002",

    grade: 10,
    subject: "Science",
    batchName: "Evening Batch A",

    tutorId: "u-tutor-1",
    tutorName: "Tutor",
    tutorEmail: "",

    studentIds: [
      "u-student-1",
    ],

    studentEmails: [],

    schedule: {
      day: "Monday",
      label: "Upcoming",

      startTime: "18:00",
      endTime: "19:00",

      startTimeISO: "2026-08-10T18:00:00+05:30",
      endTimeISO: "2026-08-10T19:00:00+05:30",
    },

    meetUrl: "",

    whiteboardUrl: "https://excalidraw.com",

    resources: [],
  },

  {
    id: "cls-003",

    grade: 11,
    subject: "Physics",
    batchName: "Evening Batch B",

    tutorId: "u-tutor-1",
    tutorName: "Tutor",
    tutorEmail: "",

    studentIds: [
      "u-student-1",
    ],

    studentEmails: [],

    schedule: {
      day: "Monday",
      label: "Upcoming",

      startTime: "19:00",
      endTime: "20:00",

      startTimeISO: "2026-08-10T19:00:00+05:30",
      endTimeISO: "2026-08-10T20:00:00+05:30",
    },

    meetUrl: "",

    whiteboardUrl: "https://excalidraw.com",

    resources: [],
  },

  {
    id: "cls-004",

    grade: 12,
    subject: "Revision / Weekly Test",
    batchName: "Friday Revision",

    tutorId: "u-tutor-1",
    tutorName: "Tutor",
    tutorEmail: "",

    studentIds: [
      "u-student-1",
    ],

    studentEmails: [],

    schedule: {
      day: "Friday",
      label: "Weekly Test",

      startTime: "18:00",
      endTime: "19:00",

      startTimeISO: "2026-08-14T18:00:00+05:30",
      endTimeISO: "2026-08-14T19:00:00+05:30",
    },

    meetUrl: "",

    whiteboardUrl: "https://excalidraw.com",

    resources: [],
  },
];

// ----------------------------------------------------
// Storage
// ----------------------------------------------------

function loadClasses() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(
      "Unable to load classroom data:",
      error
    );
  }

  return structuredClone(defaultClasses);
}

let classes = loadClasses();

function saveClasses() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(classes)
    );
  } catch (error) {
    console.error(
      "Unable to save classroom data:",
      error
    );
  }
}

const delay = (ms = 150) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ----------------------------------------------------
// LIST CLASSES
// ----------------------------------------------------

export async function listClassesForUser(user) {
  await delay();

  if (!user) {
    return [];
  }

  if (user.role === "admin") {
    return [...classes];
  }

  if (user.role === "tutor") {
    return classes.filter(
      (classItem) =>
        classItem.tutorId === user.id
    );
  }

  return classes.filter(
    (classItem) =>
      Array.isArray(classItem.studentIds) &&
      classItem.studentIds.includes(user.id)
  );
}

// ----------------------------------------------------
// GET CLASS
// ----------------------------------------------------

export async function getClass(classId) {
  await delay();

  return (
    classes.find(
      (classItem) =>
        classItem.id === classId
    ) || null
  );
}

// ----------------------------------------------------
// CREATE CLASS
// ----------------------------------------------------

export async function createClass(classData) {
  await delay();

  const newClass = {
    id:
      classData.id ||
      `cls-${Date.now()}`,

    grade:
      classData.grade || 9,

    subject:
      classData.subject || "Subject",

    batchName:
      classData.batchName || "Morning Batch",

    tutorId:
      classData.tutorId || "",

    tutorName:
      classData.tutorName || "Tutor",

    tutorEmail:
      classData.tutorEmail || "",

    studentIds:
      Array.isArray(classData.studentIds)
        ? classData.studentIds
        : [],

    studentEmails:
      Array.isArray(classData.studentEmails)
        ? classData.studentEmails
        : [],

    schedule: {
      day:
        classData.schedule?.day || "",

      label:
        classData.schedule?.label || "Upcoming",

      startTime:
        classData.schedule?.startTime || "",

      endTime:
        classData.schedule?.endTime || "",

      startTimeISO:
        classData.schedule?.startTimeISO || "",

      endTimeISO:
        classData.schedule?.endTimeISO || "",
    },

    meetUrl:
      classData.meetUrl || "",

    whiteboardUrl:
      classData.whiteboardUrl ||
      "https://excalidraw.com",

    resources:
      Array.isArray(classData.resources)
        ? classData.resources
        : [],
  };

  classes = [...classes, newClass];

  saveClasses();

  return newClass;
}

// ----------------------------------------------------
// UPDATE CLASS
// ----------------------------------------------------

export async function updateClass(
  classId,
  updates
) {
  await delay();

  classes = classes.map((classItem) => {
    if (classItem.id !== classId) {
      return classItem;
    }

    return {
      ...classItem,
      ...updates,

      schedule: updates.schedule
        ? {
            ...classItem.schedule,
            ...updates.schedule,
          }
        : classItem.schedule,
    };
  });

  saveClasses();

  return (
    classes.find(
      (classItem) =>
        classItem.id === classId
    ) || null
  );
}

// ----------------------------------------------------
// UPDATE MEET URL
// ----------------------------------------------------

export async function updateMeetUrl(
  classId,
  meetUrl
) {
  await delay();

  classes = classes.map((classItem) =>
    classItem.id === classId
      ? {
          ...classItem,
          meetUrl,
        }
      : classItem
  );

  saveClasses();

  return (
    classes.find(
      (classItem) =>
        classItem.id === classId
    ) || null
  );
}

// ----------------------------------------------------
// ADD RESOURCE
// ----------------------------------------------------

export async function addResource(
  classId,
  resource
) {
  await delay();

  const newResource = {
    id:
      resource.id ||
      `res-${Date.now()}`,

    type:
      resource.type || "doc",

    title:
      resource.title || "Resource",

    url:
      resource.url || "#",
  };

  classes = classes.map((classItem) => {
    if (classItem.id !== classId) {
      return classItem;
    }

    return {
      ...classItem,

      resources: [
        ...(classItem.resources || []),
        newResource,
      ],
    };
  });

  saveClasses();

  return newResource;
}

// ----------------------------------------------------
// DELETE RESOURCE
// ----------------------------------------------------

export async function deleteResource(
  classId,
  resourceId
) {
  await delay();

  classes = classes.map((classItem) => {
    if (classItem.id !== classId) {
      return classItem;
    }

    return {
      ...classItem,

      resources: (
        classItem.resources || []
      ).filter(
        (resource) =>
          resource.id !== resourceId
      ),
    };
  });

  saveClasses();

  return true;
}

// ----------------------------------------------------
// DELETE CLASS
// ----------------------------------------------------

export async function deleteClass(classId) {
  await delay();

  classes = classes.filter(
    (classItem) =>
      classItem.id !== classId
  );

  saveClasses();

  return true;
}

// ----------------------------------------------------
// RESET TEMPORARY DATA
// ----------------------------------------------------

export async function resetClasses() {
  await delay();

  classes = structuredClone(defaultClasses);

  saveClasses();

  return [...classes];
}