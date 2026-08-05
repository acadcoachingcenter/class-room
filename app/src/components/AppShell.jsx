import { GraduationCap } from "lucide-react";
import DevRoleSwitcher from "./DevRoleSwitcher";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-chalk font-body">
      <header className="border-b border-chalkline bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-board" />
            <span className="font-display text-lg font-semibold text-ink">ACAD</span>
            <span className="mx-2 h-4 w-px bg-chalkline" />
            <span className="text-sm font-medium text-slate">Online Classroom</span>
          </div>
          <DevRoleSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
