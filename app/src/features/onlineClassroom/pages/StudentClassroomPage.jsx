import { useEffect, useState } from "react";
import { useCurrentUser } from "../../../lib/mockAuth";
import { listClassesForUser, classStatus } from "../../../lib/classroomApi";
import ClassBanner from "../components/ClassBanner";
import ClassCard from "../components/ClassCard";

export default function StudentClassroomPage() {
  const { user } = useCurrentUser();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listClassesForUser(user).then((cls) => {
      setClasses(cls);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <p className="text-slate">Loading your classes…</p>;
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-chalkline bg-white p-8 text-center">
        <p className="font-display text-lg text-ink">No classes assigned yet</p>
        <p className="mt-1 text-sm text-slate">
          Your tutor will assign you to a class, and it'll show up here.
        </p>
      </div>
    );
  }

  const todays = classes.find((c) => classStatus(c) === "live-soon") || classes[0];
  const rest = classes.filter((c) => c.id !== todays.id);

  return (
    <div className="flex flex-col gap-8">
      <ClassBanner classItem={todays} />

      {rest.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold text-ink">
            Your Other Classes
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((c) => (
              <ClassCard key={c.id} classItem={c} canEditMeetUrl={false} showTutorName />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
