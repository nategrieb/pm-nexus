import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  FolderKanban,
  Users,
  Ticket,
  CalendarRange,
  GanttChart,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useSyncAll } from "../hooks/useSync";

const links = [
  { to: "/", label: "Projects", icon: FolderKanban },
  { to: "/roadmap", label: "Roadmap", icon: GanttChart },
  { to: "/engineers", label: "Engineers", icon: Users },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/sprint-planning", label: "Sprint Planning", icon: CalendarRange },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const syncAll = useSyncAll();
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setResult(null);
    try {
      const res = await syncAll.mutateAsync();
      setResult(
        `${res.tickets_created} created, ${res.tickets_updated} updated` +
          (res.errors.length > 0 ? ` (${res.errors.length} errors)` : "")
      );
      setTimeout(() => setResult(null), 5000);
    } catch {
      setResult("Sync failed");
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <aside className="w-56 bg-slate-900 text-slate-200 min-h-screen flex flex-col">
      <div className="px-5 py-6">
        <h1 className="text-xl font-bold tracking-tight text-white">
          NATE APP FOR NATE STUFF
        </h1>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 pb-5">
        <button
          onClick={handleSync}
          disabled={syncAll.isPending}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={syncAll.isPending ? "animate-spin" : ""} />
          {syncAll.isPending ? "Syncing..." : "Sync with Jira"}
        </button>
        {result && (
          <p className="text-xs text-slate-400 mt-2 text-center">{result}</p>
        )}
      </div>
    </aside>
  );
}
