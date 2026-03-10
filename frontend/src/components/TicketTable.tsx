import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Ticket, GapAnalysisItem } from "../types";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  tickets: Ticket[];
  gaps?: GapAnalysisItem[];
  engineerMap?: Map<number, string>;
}

type SortKey = "jira_key" | "title" | "status" | "points" | "assignee" | "flags";
type SortDir = "asc" | "desc";

export default function TicketTable({ tickets, gaps = [], engineerMap }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const gapMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const g of gaps) {
      const existing = m.get(g.jira_key) || [];
      existing.push(g.issue);
      m.set(g.jira_key, existing);
    }
    return m;
  }, [gaps]);

  const sorted = useMemo(() => {
    if (!sortKey) return tickets;
    const copy = [...tickets];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "jira_key": {
          // Sort by project prefix, then numeric part
          const numA = parseInt(a.jira_key.split("-").pop() || "0");
          const numB = parseInt(b.jira_key.split("-").pop() || "0");
          cmp = numA - numB;
          break;
        }
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "points":
          cmp = (a.points ?? -1) - (b.points ?? -1);
          break;
        case "assignee": {
          const na = (engineerMap && a.assignee_id ? engineerMap.get(a.assignee_id) : null) ?? "";
          const nb = (engineerMap && b.assignee_id ? engineerMap.get(b.assignee_id) : null) ?? "";
          cmp = na.localeCompare(nb);
          break;
        }
        case "flags": {
          const fa = (gapMap.get(a.jira_key) || []).length;
          const fb = (gapMap.get(b.jira_key) || []).length;
          cmp = fa - fb;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [tickets, sortKey, sortDir, gapMap]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {(
              [
                ["jira_key", "Key"],
                ["title", "Title"],
                ...(engineerMap ? [["assignee", "Assignee"] as [SortKey, string]] : []),
                ["status", "Status"],
                ["points", "Points"],
                ["flags", "Flags"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                className="py-2 px-3 font-medium cursor-pointer select-none hover:text-slate-700"
                onClick={() => handleSort(key)}
              >
                <div className="flex items-center gap-1">
                  {label}
                  <SortIcon col={key} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const issues = gapMap.get(t.jira_key) || [];
            return (
              <tr
                key={t.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="py-2 px-3 font-mono">
                  <a
                    href={`https://collectors.atlassian.net/browse/${t.jira_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {t.jira_key}
                  </a>
                </td>
                <td className="py-2 px-3">{t.title}</td>
                {engineerMap && (
                  <td className="py-2 px-3">
                    {t.assignee_id && engineerMap.get(t.assignee_id) ? (
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold"
                        title={engineerMap.get(t.assignee_id)}
                      >
                        {getInitials(engineerMap.get(t.assignee_id)!)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                )}
                <td className="py-2 px-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="py-2 px-3">{t.points ?? "—"}</td>
                <td className="py-2 px-3 flex gap-1">
                  {issues.includes("unpointed") && (
                    <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                      Unpointed
                    </span>
                  )}
                  {issues.includes("unassigned") && (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                      Unassigned
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={engineerMap ? 6 : 5} className="py-8 text-center text-slate-400">
                No tickets yet. Sync with Jira to pull them in.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  let color = "bg-slate-100 text-slate-600";
  if (lower === "done" || lower === "closed")
    color = "bg-emerald-100 text-emerald-700";
  else if (lower.includes("progress"))
    color = "bg-blue-100 text-blue-700";
  else if (lower.includes("review"))
    color = "bg-purple-100 text-purple-700";
  else if (lower.includes("qa"))
    color = "bg-amber-100 text-amber-700";
  else if (lower.includes("block"))
    color = "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
