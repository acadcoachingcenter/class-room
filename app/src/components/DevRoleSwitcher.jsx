import { useCurrentUser, ROLES } from "../lib/mockAuth";

export default function DevRoleSwitcher() {
  const { role, setRole } = useCurrentUser();

  return (
    <div className="flex items-center gap-2 rounded-full border border-chalkline bg-white px-3 py-1.5 text-xs">
      <span className="text-slate">Viewing as</span>
      {Object.values(ROLES).map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`rounded-full px-2.5 py-1 font-medium capitalize transition-colors ${
            role === r ? "bg-board text-chalk" : "text-slate hover:bg-chalk"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
