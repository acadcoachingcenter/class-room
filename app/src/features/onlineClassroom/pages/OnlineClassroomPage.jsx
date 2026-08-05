import { useCurrentUser, ROLES } from "../../../lib/mockAuth";
import StudentClassroomPage from "./StudentClassroomPage";
import TutorClassroomPage from "./TutorClassroomPage";
import AdminClassroomPage from "./AdminClassroomPage";

export default function OnlineClassroomPage() {
  const { role } = useCurrentUser();

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Online Classroom
      </h1>
      <p className="mb-6 text-sm text-slate">
        {role === ROLES.STUDENT && "Join your live classes and access class resources."}
        {role === ROLES.TUTOR && "Manage your classes, Meet links, and materials."}
        {role === ROLES.ADMIN && "Overview of every classroom across ACAD."}
      </p>

      {role === ROLES.STUDENT && <StudentClassroomPage />}
      {role === ROLES.TUTOR && <TutorClassroomPage />}
      {role === ROLES.ADMIN && <AdminClassroomPage />}
    </div>
  );
}
