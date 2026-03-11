import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api/settings";
import {
  useSprints,
  useSprintPlan,
  useUpdateRollover,
} from "../hooks/useSprintPlanning";
import type { EngineerSprintSummary, SprintTicket } from "../types";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "done" || s === "closed" || s === "ready for prod release") return "bg-emerald-100 text-emerald-700";
  if (s.includes("progress")) return "bg-blue-100 text-blue-700";
  if (s.includes("review")) return "bg-purple-100 text-purple-700";
  if (s.includes("qa")) return "bg-amber-100 text-amber-700";
  if (s === "blocked") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function capacityColor(assigned: number, available: number): string {
  if (available <= 0) return "bg-slate-200";
  const ratio = assigned / available;
  if (ratio > 1) return "bg-red-500";
  if (ratio > 0.85) return "bg-amber-500";
  return "bg-emerald-500";
}

function RolloverInput({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(local) || 0;
    if (n !== value) onSave(n);
  };

  return (
    <input
      ref={ref}
      type="number"
      step="0.5"
      min="0"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          ref.current?.blur();
        }
      }}
      className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
}

function TicketRow({ t }: { t: SprintTicket }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <a
        href={`https://collectors.atlassian.net/browse/${t.jira_key}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-blue-600 hover:underline shrink-0"
      >
        {t.jira_key}
      </a>
      <span className="truncate text-slate-600">{t.title}</span>
      <span className="ml-auto shrink-0 flex items-center gap-1.5">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(t.status)}`}>
          {t.status}
        </span>
        {t.points != null && (
          <span className="text-slate-400 w-6 text-right">{t.points}</span>
        )}
      </span>
    </div>
  );
}

function EngineerCard({
  eng,
  sprintId,
}: {
  eng: EngineerSprintSummary;
  sprintId: number;
}) {
  const updateRollover = useUpdateRollover();
  const [open, setOpen] = useState(eng.tickets.length <= 6);
  const barPct = eng.available_points > 0
    ? Math.min((eng.assigned_points / eng.available_points) * 100, 100)
    : eng.assigned_points > 0 ? 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Link
          to={`/engineers/${eng.engineer_id}`}
          className="font-semibold text-slate-800 hover:text-blue-600 text-sm"
        >
          {eng.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className={eng.assigned_points > eng.available_points ? "text-red-600 font-medium" : "text-slate-600"}>
            {eng.assigned_points}
          </span>
          <span>/</span>
          <span>{eng.available_points}</span>
          <span>pts</span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-2">
        <div
          className={`h-full rounded-full transition-all ${capacityColor(eng.assigned_points, eng.available_points)}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Capacity details */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
        <span>Cap: {eng.sprint_capacity}</span>
        <span className="flex items-center gap-1">
          Rollover:
          <RolloverInput
            value={eng.rollover_points}
            onSave={(v) =>
              updateRollover.mutate({
                sprintId,
                engineerId: eng.engineer_id,
                rolloverPoints: v,
              })
            }
          />
        </span>
        <span>Avail: {eng.available_points}</span>
      </div>

      {/* Tickets */}
      {eng.tickets.length > 0 && (
        <div>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 mb-1"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {eng.tickets.length} ticket{eng.tickets.length !== 1 ? "s" : ""}
          </button>
          {open && (
            <div className="divide-y divide-slate-50">
              {eng.tickets.map((t) => (
                <TicketRow key={t.jira_key} t={t} />
              ))}
            </div>
          )}
        </div>
      )}
      {eng.tickets.length === 0 && (
        <p className="text-[11px] text-slate-400">No tickets assigned</p>
      )}
    </div>
  );
}

export default function SprintPlanningPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const boardId = settings
    ? (() => {
        const v = settings.find((s) => s.key === "jira_board_id")?.value;
        return v ? parseInt(v, 10) : null;
      })()
    : null;

  const { data: sprints, isLoading: sprintsLoading } = useSprints(boardId);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [unassignedOpen, setUnassignedOpen] = useState(true);

  // Default to first future sprint, fallback to active, then to the first available
  useEffect(() => {
    if (sprints && sprints.length > 0 && selectedSprintId === null) {
      const future = sprints.find((s) => s.state === "future");
      const active = sprints.find((s) => s.state === "active");
      setSelectedSprintId(future?.id ?? active?.id ?? sprints[0].id);
    }
  }, [sprints, selectedSprintId]);

  const { data: plan, isLoading: planLoading } = useSprintPlan(selectedSprintId);

  if (!boardId && !sprintsLoading) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Sprint Planning</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-800 font-medium">No Jira board configured</p>
            <p className="text-sm text-amber-700 mt-1">
              Set a <span className="font-medium">Jira Board ID</span> in{" "}
              <Link to="/settings" className="underline hover:text-amber-900">Settings</Link>{" "}
              to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sprint Planning</h1>
        <div className="flex items-center gap-3">
          {sprints && (
            <select
              value={selectedSprintId ?? ""}
              onChange={(e) => setSelectedSprintId(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.state})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {(sprintsLoading || planLoading) && (
        <div className="text-sm text-slate-400">Loading sprint data...</div>
      )}

      {plan && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-400">Total Points</div>
              <div className="text-xl font-bold text-slate-800">{plan.total_points}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-400">Assigned</div>
              <div className="text-xl font-bold text-slate-800">
                {plan.engineers.reduce((s, e) => s + e.assigned_points, 0)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-400">Unassigned</div>
              <div className={`text-xl font-bold ${plan.unassigned_count > 0 ? "text-amber-600" : "text-slate-800"}`}>
                {plan.unassigned_points} <span className="text-sm font-normal text-slate-400">({plan.unassigned_count} tickets)</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-400">Engineers</div>
              <div className="text-xl font-bold text-slate-800">{plan.engineers.length}</div>
            </div>
          </div>

          {/* Engineer capacity grid */}
          <h2 className="font-semibold text-slate-700 mb-3">Engineer Capacity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {plan.engineers.map((eng) => (
              <EngineerCard
                key={eng.engineer_id}
                eng={eng}
                sprintId={selectedSprintId!}
              />
            ))}
          </div>

          {/* Unassigned tickets */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <button
              onClick={() => setUnassignedOpen(!unassignedOpen)}
              className="flex items-center gap-2 font-semibold text-slate-700 mb-3"
            >
              {unassignedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Unassigned Tickets ({plan.unassigned_count})
              {plan.unassigned_points > 0 && (
                <span className="text-sm font-normal text-slate-400">
                  {plan.unassigned_points} pts
                </span>
              )}
            </button>
            {unassignedOpen && plan.unassigned_tickets.length > 0 && (
              <div className="divide-y divide-slate-100">
                {plan.unassigned_tickets.map((t) => (
                  <div key={t.jira_key} className="flex items-center gap-2 text-sm py-2">
                    <a
                      href={`https://collectors.atlassian.net/browse/${t.jira_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-600 hover:underline shrink-0"
                    >
                      {t.jira_key}
                    </a>
                    <span className="truncate text-slate-600">{t.title}</span>
                    <span className="ml-auto shrink-0 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                      {t.points != null && (
                        <span className="text-slate-400">{t.points} pts</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {unassignedOpen && plan.unassigned_tickets.length === 0 && (
              <p className="text-sm text-slate-400">All tickets are assigned.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
