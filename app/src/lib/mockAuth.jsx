// TEMPORARY dev-only auth stand-in.
// Replace with the real ACAD auth context/hook once merged into app/src.
// The rest of this feature only depends on the shape returned by useCurrentUser(),
// so swapping this file out is the entire integration step.

import { createContext, useContext, useState } from "react";

export const ROLES = {
  ADMIN: "admin",
  TUTOR: "tutor",
  STUDENT: "student",
};

const DEMO_USERS = {
  [ROLES.ADMIN]: { id: "u-admin-1", role: ROLES.ADMIN, name: "Admin" },
  [ROLES.TUTOR]: { id: "u-tutor-1", role: ROLES.TUTOR, name: "Mr. Kumar" },
  [ROLES.STUDENT]: { id: "u-student-1", role: ROLES.STUDENT, name: "Aditi R." },
};

const AuthContext = createContext(null);

export function DevAuthProvider({ children }) {
  const [role, setRole] = useState(ROLES.STUDENT);
  const value = {
    user: DEMO_USERS[role],
    role,
    setRole,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useCurrentUser must be used within DevAuthProvider");
  return ctx;
}
