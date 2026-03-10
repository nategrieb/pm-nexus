interface KanbanTicket {
  jira_key: string;
  title: string;
  points: number | null;
  epic_key?: string | null;
}

interface Props {
  data: Record<string, KanbanTicket[]>;
}

const COLUMN_ORDER = [
  "To Do",
  "In progress",
  "Code Review",
  "In QA",
  "Ready for QA",
  "Blocked",
  "Ready for Prod Release",
  "PM Review",
  "Scoping",
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "To Do":                  { bg: "bg-slate-50",  text: "text-slate-600",  dot: "bg-slate-400" },
  "In progress":            { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  "Code Review":            { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  "In QA":                  { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  "Ready for QA":           { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  "Blocked":                { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
  "Ready for Prod Release": { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  "PM Review":              { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  "Scoping":                { bg: "bg-cyan-50",   text: "text-cyan-700",   dot: "bg-cyan-500" },
};

const DEFAULT_COLOR = { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };

export default function KanbanBoard({ data }: Props) {
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
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const color = STATUS_COLORS[col] || DEFAULT_COLOR;
        return (
          <div key={col} className="min-w-[200px] max-w-[220px] flex-shrink-0">
            <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 px-1 ${color.text}`}>
              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
              {col}
              <span className="text-slate-400 font-normal ml-auto">
                {data[col].length}
              </span>
            </div>
            <div className="space-y-1.5">
              {data[col].map((ticket) => (
                <div
                  key={ticket.jira_key}
                  className={`${color.bg} border border-slate-200/60 rounded-md px-2.5 py-2`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <a
                      href={`https://collectors.atlassian.net/browse/${ticket.jira_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-blue-600 hover:underline leading-none"
                    >
                      {ticket.jira_key}
                    </a>
                    {ticket.points != null && (
                      <span className="text-[10px] font-medium bg-white/80 text-slate-500 rounded px-1 py-0.5 leading-none">
                        {ticket.points}p
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] leading-snug text-slate-700 mt-1 line-clamp-2">
                    {ticket.title}
                  </div>
                  {ticket.epic_key && (
                    <a
                      href={`https://collectors.atlassian.net/browse/${ticket.epic_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-slate-400 hover:text-blue-500 mt-1 block leading-none"
                    >
                      {ticket.epic_key}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
