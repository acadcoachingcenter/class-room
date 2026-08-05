import { useEffect, useState } from "react";
import { useCurrentUser } from "../../../lib/mockAuth";
import { listClassesForUser } from "../../../lib/classroomApi";
import ClassCard from "../components/ClassCard";

export default function TutorClassroomPage() {
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

  return (
    <div>
      <p className="mb-4 text-sm text-slate">
        Set or update the Google Meet link for each class below. Students assigned
        to a class always see its current link — no need to resend it elsewhere.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map((c) => (
          <ClassCard key={c.id} classItem={c} canEditMeetUrl />
        ))}
      </div>
    </div>
  );
}
