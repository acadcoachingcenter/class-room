import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Edit3,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useCurrentUser } from "../../../lib/mockAuth";

import {
  createClass,
  deleteClass,
  listClassesForUser,
  syncClassToCalendar,
  updateClass,
} from "../../../lib/classroomApi";

import ClassCard from "../components/ClassCard";

// ----------------------------------------------------
// ACAD TIME CONFIGURATION
// ----------------------------------------------------

const INDIA_TIMEZONE = "Asia/Kolkata";
const INDIA_OFFSET = "+05:30";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const TIME_SLOTS = [
  {
    id: "morning",
    name: "Morning",
    startTime: "06:00",
    endTime: "07:00",
  },
  {
    id: "evening-a",
    name: "Evening A",
    startTime: "18:00",
    endTime: "19:00",
  },
  {
    id: "evening-b",
    name: "Evening B",
    startTime: "19:00",
    endTime: "20:00",
  },
];

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Science",
  "English",
  "Tamil",
  "Hindi",
  "Computer Science",
  "Revision / Weekly Test",
];

// ----------------------------------------------------
// INDIA DATE / TIME HELPERS
// ----------------------------------------------------

function getIndiaDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getIndiaDayFromDate(dateString) {
  if (!dateString) return "";

  // Noon IST avoids accidental date shifting when interpreted elsewhere.
  const date = new Date(`${dateString}T12:00:00${INDIA_OFFSET}`);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: INDIA_TIMEZONE,
  }).format(date);
}

function getIndiaNowDisplay() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function isWeekend(day) {
  return day === "Saturday" || day === "Sunday";
}

function formatTime(time) {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function buildISO(date, time) {
  if (!date || !time) return "";

  return `${date}T${time}:00${INDIA_OFFSET}`;
}

function createEmptyForm() {
  const today = getIndiaDateString();
  const todayDay = getIndiaDayFromDate(today);

  return {
    grade: "9",
    subject: "Mathematics",
    batchName: "Morning",
    day: todayDay,
    date: today,
    timeSlot: "morning",
    tutorName: "Tutor",
    tutorEmail: "",
    studentEmails: "",
  };
}

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------

export default function AdminClassroomPage() {
  const { user } = useCurrentUser();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(() => createEmptyForm());

  const [saving, setSaving] = useState(false);
  const [calendarSyncing, setCalendarSyncing] = useState(null);

  const [message, setMessage] = useState("");
  const [indiaNow, setIndiaNow] = useState(() => getIndiaNowDisplay());

  // ----------------------------------------------------
  // CURRENT INDIA TIME DISPLAY
  // ----------------------------------------------------

  useEffect(() => {
    const timer = setInterval(() => {
      setIndiaNow(getIndiaNowDisplay());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------------------
  // LOAD CLASSES
  // ----------------------------------------------------

  async function refreshClasses() {
    try {
      const result = await listClassesForUser(user);
      setClasses(result);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load classes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshClasses();
  }, [user]);

  // ----------------------------------------------------
  // GROUP CLASSES BY DAY
  // ----------------------------------------------------

  const groupedClasses = useMemo(() => {
    const result = {};

    DAYS.forEach((day) => {
      result[day] = [];
    });

    classes.forEach((classItem) => {
      const day = classItem.schedule?.day;

      if (!day || !DAYS.includes(day)) {
        return;
      }

      result[day].push(classItem);
    });

    Object.values(result).forEach((items) => {
      items.sort((a, b) =>
        (a.schedule?.startTime || "").localeCompare(
          b.schedule?.startTime || ""
        )
      );
    });

    return result;
  }, [classes]);

  // ----------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleDateChange(selectedDate) {
    if (!selectedDate) {
      setForm((current) => ({
        ...current,
        date: "",
        day: "",
      }));

      return;
    }

    const dayName = getIndiaDayFromDate(selectedDate);

    if (isWeekend(dayName)) {
      setMessage(
        "Live classes are scheduled Monday to Friday only. Please select a weekday."
      );

      setForm((current) => ({
        ...current,
        date: selectedDate,
        day: dayName,
      }));

      return;
    }

    setMessage("");

    setForm((current) => ({
      ...current,
      date: selectedDate,
      day: dayName,

      subject:
        dayName === "Friday"
          ? "Revision / Weekly Test"
          : current.subject === "Revision / Weekly Test"
          ? "Mathematics"
          : current.subject,
    }));
  }

  function openNewClass() {
    setEditingId(null);
    setForm(createEmptyForm());
    setMessage("");
    setShowEditor(true);
  }

  function openEditClass(classItem) {
    const slot =
      TIME_SLOTS.find(
        (item) =>
          item.startTime === classItem.schedule?.startTime &&
          item.endTime === classItem.schedule?.endTime
      ) || TIME_SLOTS[0];

    const date = classItem.schedule?.startTimeISO
      ? classItem.schedule.startTimeISO.slice(0, 10)
      : getIndiaDateString();

    const calculatedDay = getIndiaDayFromDate(date);

    setEditingId(classItem.id);

    setForm({
      grade: String(classItem.grade || 9),

      subject:
        calculatedDay === "Friday"
          ? "Revision / Weekly Test"
          : classItem.subject || "Mathematics",

      batchName: classItem.batchName || slot.name,

      day: calculatedDay,

      date,

      timeSlot: slot.id,

      tutorName: classItem.tutorName || "Tutor",

      tutorEmail: classItem.tutorEmail || "",

      studentEmails: (classItem.studentEmails || []).join(", "),
    });

    setMessage("");
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
    setForm(createEmptyForm());
  }

  // ----------------------------------------------------
  // SAVE CLASS
  // ----------------------------------------------------

  async function handleSave(event) {
    event.preventDefault();

    if (!form.date) {
      setMessage("Please select a class date.");
      return;
    }

    const actualDay = getIndiaDayFromDate(form.date);

    if (isWeekend(actualDay)) {
      setMessage(
        "Saturday and Sunday cannot be used for regular ACAD live classes."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const selectedSlot =
        TIME_SLOTS.find((slot) => slot.id === form.timeSlot) ||
        TIME_SLOTS[0];

      const studentEmails = form.studentEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      const payload = {
        grade: Number(form.grade),

        subject:
          actualDay === "Friday"
            ? "Revision / Weekly Test"
            : form.subject,

        batchName: form.batchName,

        tutorId: "u-tutor-1",

        tutorName: form.tutorName.trim() || "Tutor",

        tutorEmail: form.tutorEmail.trim(),

        studentIds: [],

        studentEmails,

        schedule: {
          day: actualDay,

          date: form.date,

          timezone: INDIA_TIMEZONE,

          timezoneOffset: INDIA_OFFSET,

          label:
            actualDay === "Friday"
              ? "Weekly Test"
              : "Upcoming",

          startTime: selectedSlot.startTime,

          endTime: selectedSlot.endTime,

          startTimeISO: buildISO(
            form.date,
            selectedSlot.startTime
          ),

          endTimeISO: buildISO(
            form.date,
            selectedSlot.endTime
          ),
        },

        meetUrl: "",

        whiteboardUrl: "https://excalidraw.com",

        resources: [],
      };

      if (editingId) {
        await updateClass(editingId, payload);

        setMessage("Class updated successfully.");
      } else {
        await createClass(payload);

        setMessage("Class scheduled successfully.");
      }

      await refreshClasses();

      setShowEditor(false);
      setEditingId(null);
      setForm(createEmptyForm());
    } catch (error) {
      console.error(error);

      setMessage(error.message || "Unable to save class.");
    } finally {
      setSaving(false);
    }
  }

  // ----------------------------------------------------
  // DELETE CLASS
  // ----------------------------------------------------

  async function handleDelete(classItem) {
    const confirmed = window.confirm(
      `Delete ${classItem.subject} - ${classItem.batchName}?`
    );

    if (!confirmed) return;

    try {
      await deleteClass(classItem.id);

      await refreshClasses();

      setMessage("Class deleted.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete class.");
    }
  }

  // ----------------------------------------------------
  // GOOGLE CALENDAR
  // ----------------------------------------------------

  async function handleCalendarSync(classItem) {
    if (!classItem.schedule?.startTimeISO) {
      setMessage(
        "Please edit this class and select a date before syncing with Google Calendar."
      );

      return;
    }

    setCalendarSyncing(classItem.id);
    setMessage("");

    try {
      const result = await syncClassToCalendar(classItem, {
        tutorEmail: classItem.tutorEmail || "",
        studentEmails: classItem.studentEmails || [],
      });

      setMessage(
        result.mocked
          ? "Calendar demo sync completed."
          : "Google Calendar and Meet updated successfully."
      );

      await refreshClasses();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message || "Google Calendar sync failed."
      );
    } finally {
      setCalendarSyncing(null);
    }
  }

  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

  if (loading) {
    return (
      <p className="text-slate">
        Loading all classes...
      </p>
    );
  }

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Live Class Timetable
          </h2>

          <p className="mt-1 text-sm text-slate">
            Manage Grades 9-12 live classes, tutors,
            batches and weekly tests.
          </p>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate">
            <Clock size={14} />

            <span>
              India Time: {indiaNow} (IST)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewClass}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={17} />
          Schedule Class
        </button>
      </div>

      {/* MESSAGE */}

      {message && (
        <div className="rounded-lg border border-chalkline bg-white px-4 py-3 text-sm text-ink">
          {message}
        </div>
      )}

      {/* CLASS EDITOR */}

      {showEditor && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-chalkline bg-white p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">
                {editingId
                  ? "Edit Live Class"
                  : "Schedule Live Class"}
              </h3>

              <p className="text-sm text-slate">
                All class times use India Standard Time (Asia/Kolkata).
                Friday is reserved for revision and weekly tests.
              </p>
            </div>

            <button
              type="button"
              onClick={closeEditor}
              className="rounded-lg p-2 text-slate hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {/* GRADE */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Grade
              </span>

              <select
                value={form.grade}
                onChange={(e) =>
                  updateForm("grade", e.target.value)
                }
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              >
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </label>

            {/* DATE */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Date
              </span>

              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  handleDateChange(e.target.value)
                }
                required
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              />
            </label>

            {/* DAY - AUTOMATIC */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Day
              </span>

              <input
                type="text"
                value={form.day}
                readOnly
                className="w-full rounded-lg border border-chalkline bg-slate-50 px-3 py-2"
              />

              <span className="mt-1 block text-xs text-slate">
                Automatically calculated from the selected date.
              </span>
            </label>

            {/* TIME */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Time
              </span>

              <select
                value={form.timeSlot}
                onChange={(e) => {
                  const value = e.target.value;

                  const slot = TIME_SLOTS.find(
                    (item) => item.id === value
                  );

                  setForm((current) => ({
                    ...current,
                    timeSlot: value,
                    batchName:
                      slot?.name || current.batchName,
                  }));
                }}
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              >
                {TIME_SLOTS.map((slot) => (
                  <option
                    key={slot.id}
                    value={slot.id}
                  >
                    {slot.name} - {formatTime(slot.startTime)} to{" "}
                    {formatTime(slot.endTime)}
                  </option>
                ))}
              </select>
            </label>

            {/* SUBJECT */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Subject
              </span>

              <select
                value={
                  form.day === "Friday"
                    ? "Revision / Weekly Test"
                    : form.subject
                }
                disabled={form.day === "Friday"}
                onChange={(e) =>
                  updateForm("subject", e.target.value)
                }
                className="w-full rounded-lg border border-chalkline px-3 py-2 disabled:bg-slate-100"
              >
                {SUBJECTS.map((subject) => (
                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>
                ))}
              </select>
            </label>

            {/* BATCH */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Batch Name
              </span>

              <input
                value={form.batchName}
                onChange={(e) =>
                  updateForm("batchName", e.target.value)
                }
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              />
            </label>

            {/* TUTOR */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Tutor Name
              </span>

              <input
                value={form.tutorName}
                onChange={(e) =>
                  updateForm("tutorName", e.target.value)
                }
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              />
            </label>

            {/* TUTOR EMAIL */}

            <label className="text-sm">
              <span className="mb-1 block font-medium text-ink">
                Tutor Email
              </span>

              <input
                type="email"
                value={form.tutorEmail}
                onChange={(e) =>
                  updateForm("tutorEmail", e.target.value)
                }
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              />
            </label>

            {/* STUDENTS */}

            <label className="text-sm md:col-span-2 lg:col-span-3">
              <span className="mb-1 block font-medium text-ink">
                Student Emails
              </span>

              <input
                value={form.studentEmails}
                onChange={(e) =>
                  updateForm(
                    "studentEmails",
                    e.target.value
                  )
                }
                placeholder="student1@example.com, student2@example.com"
                className="w-full rounded-lg border border-chalkline px-3 py-2"
              />

              <span className="mt-1 block text-xs text-slate">
                Separate multiple email addresses with commas.
              </span>
            </label>
          </div>

          {/* SAVE */}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={
                saving ||
                !form.date ||
                isWeekend(form.day)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />

              {saving
                ? "Saving..."
                : editingId
                ? "Save Changes"
                : "Schedule Class"}
            </button>

            <button
              type="button"
              onClick={closeEditor}
              className="rounded-lg border border-chalkline px-4 py-2 text-sm font-medium text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* WEEKLY TIMETABLE */}

      <div className="space-y-5">
        {DAYS.map((day) => (
          <section
            key={day}
            className="overflow-hidden rounded-xl border border-chalkline bg-white"
          >
            <div className="flex items-center justify-between border-b border-chalkline px-5 py-3">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={17}
                  className="text-slate"
                />

                <h3 className="font-display font-semibold text-ink">
                  {day}
                </h3>
              </div>

              {day === "Friday" && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate">
                  Revision / Weekly Test
                </span>
              )}
            </div>

            {groupedClasses[day]?.length ? (
              <div className="divide-y divide-chalkline">
                {groupedClasses[day].map(
                  (classItem) => (
                    <div
                      key={classItem.id}
                      className="p-4"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate">
                              Time
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-ink">
                              <Clock size={14} />

                              {formatTime(
                                classItem.schedule?.startTime
                              )}

                              {" - "}

                              {formatTime(
                                classItem.schedule?.endTime
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate">
                              Grade
                            </p>

                            <p className="mt-1 text-sm font-semibold text-ink">
                              Grade {classItem.grade || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate">
                              Subject
                            </p>

                            <p className="mt-1 text-sm font-semibold text-ink">
                              {classItem.subject}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate">
                              Batch
                            </p>

                            <p className="mt-1 text-sm text-ink">
                              {classItem.batchName}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate">
                              Tutor
                            </p>

                            <p className="mt-1 text-sm text-ink">
                              {classItem.tutorName}
                            </p>
                          </div>
                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditClass(classItem)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-chalkline px-3 py-2 text-xs font-semibold text-ink"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={
                              calendarSyncing === classItem.id
                            }
                            onClick={() =>
                              handleCalendarSync(classItem)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-chalkline px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
                          >
                            <CalendarDays size={14} />

                            {calendarSyncing === classItem.id
                              ? "Syncing..."
                              : "Calendar"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(classItem)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="px-5 py-6 text-sm text-slate">
                No classes scheduled.
              </div>
            )}
          </section>
        ))}
      </div>

      {/* CLASSROOM DETAILS */}

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          Classroom Details
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              canEditMeetUrl
              showTutorName
            />
          ))}
        </div>
      </div>
    </div>
  );
}
