import { useEffect, useState } from "react";
import { useCurrentUser } from "../../../lib/mockAuth";
import { listClassesForUser } from "../../../lib/classroomApi";
import ClassCard from "../components/ClassCard";

export default function AdminClassroomPage() {
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
    return <p className="text-slate">Loading all classes…</p>;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate">
        All classrooms across all tutors and batches.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map((c) => (
          <ClassCard key={c.id} classItem={c} canEditMeetUrl showTutorName />
        ))}
      </div>
    </div>
  );
}
