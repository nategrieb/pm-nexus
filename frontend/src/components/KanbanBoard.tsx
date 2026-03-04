interface KanbanTicket {
  jira_key: string;
  title: string;
  points: number | null;
}

interface Props {
  data: Record<string, KanbanTicket[]>;
}

const COLUMN_ORDER = ["To Do", "In Progress", "In Review", "Done"];

export default function KanbanBoard({ data }: Props) {
  // Get all columns, putting known ones first
  const columns = [
    ...COLUMN_ORDER.filter((c) => data[c]),
    ...Object.keys(data).filter((c) => !COLUMN_ORDER.includes(c)),
  ];

  if (columns.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-4">
        No in-flight tickets.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col} className="min-w-[250px] flex-shrink-0">
          <div className="text-sm font-semibold text-slate-600 mb-2 px-1">
            {col}{" "}
            <span className="text-slate-400 font-normal">
              ({data[col].length})
            </span>
          </div>
          <div className="space-y-2">
            {data[col].map((ticket) => (
              <div
                key={ticket.jira_key}
                className="bg-white border border-slate-200 rounded-lg p-3"
              >
                <div className="font-mono text-xs text-blue-600">
                  {ticket.jira_key}
                </div>
                <div className="text-sm mt-1">{ticket.title}</div>
                {ticket.points != null && (
                  <div className="text-xs text-slate-400 mt-1">
                    {ticket.points} pts
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
