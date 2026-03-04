import type { Ticket, GapAnalysisItem } from "../types";

interface Props {
  tickets: Ticket[];
  gaps?: GapAnalysisItem[];
}

export default function TicketTable({ tickets, gaps = [] }: Props) {
  const gapMap = new Map<string, string[]>();
  for (const g of gaps) {
    const existing = gapMap.get(g.jira_key) || [];
    existing.push(g.issue);
    gapMap.set(g.jira_key, existing);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-2 px-3 font-medium">Key</th>
            <th className="py-2 px-3 font-medium">Title</th>
            <th className="py-2 px-3 font-medium">Status</th>
            <th className="py-2 px-3 font-medium">Points</th>
            <th className="py-2 px-3 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const issues = gapMap.get(t.jira_key) || [];
            return (
              <tr
                key={t.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="py-2 px-3 font-mono text-blue-600">
                  {t.jira_key}
                </td>
                <td className="py-2 px-3">{t.title}</td>
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
              <td colSpan={5} className="py-8 text-center text-slate-400">
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

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
