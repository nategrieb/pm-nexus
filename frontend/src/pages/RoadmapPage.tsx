import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import type { Project } from "../types";

/** Parse "YYYY-MM-DD" → Date at midnight local. */
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date → "Mar 4" style. */
function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Difference in calendar days. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Generate month labels spanning a range. */
function monthLabels(start: Date, end: Date): { label: string; offsetPct: number }[] {
  const totalDays = daysBetween(start, end);
  if (totalDays <= 0) return [];

  const labels: { label: string; offsetPct: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    const offset = daysBetween(start, cursor);
    if (offset >= 0) {
      labels.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        offsetPct: (offset / totalDays) * 100,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels;
}

/** Get current quarter info. */
function getCurrentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) };
}

/** Convert quarter number to quarter string like "2026 Q1". */
function quarterStr(year: number, q: number): string {
  return `${year} Q${q}`;
}

/** Advance a quarter by n steps (+1 = next quarter, -1 = previous). */
function advanceQuarter(year: number, q: number, steps: number): { year: number; quarter: number } {
  const total = (year * 4 + (q - 1)) + steps;
  return { year: Math.floor(total / 4), quarter: (total % 4) + 1 };
}

/** Get quarters list for a filter preset. */
function getQuartersForFilter(filter: string): string[] {
  const { year, quarter } = getCurrentQuarter();

  switch (filter) {
    case "this_quarter":
      return [quarterStr(year, quarter)];
    case "next_quarter": {
      const nq = advanceQuarter(year, quarter, 1);
      return [quarterStr(nq.year, nq.quarter)];
    }
    case "this_half": {
      const halfStart = quarter <= 2 ? 1 : 3;
      return [quarterStr(year, halfStart), quarterStr(year, halfStart + 1)];
    }
    case "next_half": {
      const curHalfStart = quarter <= 2 ? 1 : 3;
      const nhStart = advanceQuarter(year, curHalfStart, 2);
      const nhEnd = advanceQuarter(nhStart.year, nhStart.quarter, 1);
      return [quarterStr(nhStart.year, nhStart.quarter), quarterStr(nhEnd.year, nhEnd.quarter)];
    }
    case "full_year":
      return [1, 2, 3, 4].map((q) => quarterStr(year, q));
    case "all":
      return [];
    default:
      return [];
  }
}

const FILTER_OPTIONS = [
  { key: "this_quarter", label: "This Quarter" },
  { key: "next_quarter", label: "Next Quarter" },
  { key: "this_half", label: "This Half" },
  { key: "next_half", label: "Next Half" },
  { key: "full_year", label: "Full Year" },
  { key: "all", label: "All" },
];

interface BarProject {
  project: Project;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
}

export default function RoadmapPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [filter, setFilter] = useState("this_quarter");

  const selectedQuarters = getQuartersForFilter(filter);

  // Filter to active projects that have at least a start or created_at
  const bars: BarProject[] = projects
    .filter((p) => !["inactive", "Complete"].includes(p.status) && p.name !== "Backlog")
    .filter((p) => {
      // "all" shows everything
      if (filter === "all" || selectedQuarters.length === 0) return true;
      // Show project if any of its quarters overlap with the selected quarters
      const pq = p.quarters ?? [];
      if (pq.length === 0) return false; // no quarters assigned → hidden when filtering
      return pq.some((q) => selectedQuarters.includes(q));
    })
    .map((p) => {
      const startDate = p.start_date
        ? parseDate(p.start_date)
        : parseDate(p.created_at.slice(0, 10));

      // End date: prefer forecast_end_date, fallback to target_date, fallback start+12 weeks
      let endDate: Date;
      if (p.forecast_end_date) {
        endDate = parseDate(p.forecast_end_date);
      } else if (p.target_date) {
        endDate = parseDate(p.target_date);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 84); // 12 weeks
      }

      // Ensure end is after start
      if (endDate <= startDate) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 28);
      }

      const progress =
        p.total_points > 0
          ? Math.round((p.completed_points / p.total_points) * 100)
          : 0;

      return { project: p, startDate, endDate, progress };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (isLoading) {
    return <div className="text-sm text-slate-400">Loading...</div>;
  }

  // Color palette for bars
  const colors = [
    { bg: "bg-blue-200", fill: "bg-blue-500", text: "text-blue-700" },
    { bg: "bg-emerald-200", fill: "bg-emerald-500", text: "text-emerald-700" },
    { bg: "bg-violet-200", fill: "bg-violet-500", text: "text-violet-700" },
    { bg: "bg-amber-200", fill: "bg-amber-500", text: "text-amber-700" },
    { bg: "bg-rose-200", fill: "bg-rose-500", text: "text-rose-700" },
    { bg: "bg-cyan-200", fill: "bg-cyan-500", text: "text-cyan-700" },
    { bg: "bg-orange-200", fill: "bg-orange-500", text: "text-orange-700" },
    { bg: "bg-indigo-200", fill: "bg-indigo-500", text: "text-indigo-700" },
  ];

  // Current filter label for display
  const currentFilterLabel = FILTER_OPTIONS.find((f) => f.key === filter)?.label ?? "";
  const filterQuarterLabel = selectedQuarters.length > 0 ? selectedQuarters.join(", ") : "";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Roadmap</h1>
          {filterQuarterLabel && (
            <p className="text-xs text-slate-400 mt-0.5">{filterQuarterLabel}</p>
          )}
        </div>
        <div className="flex gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === opt.key
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {bars.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-center py-16 text-slate-400">
            <p>No projects assigned to {currentFilterLabel.toLowerCase()}.</p>
            <p className="text-xs mt-1">Assign quarters to projects on their detail page, or select "All" to see everything.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
          {/* Month labels */}
          <div className="flex">
            <div className="w-48 shrink-0" />
            <div className="flex-1 relative h-6 border-b border-slate-100">
              {(() => {
                const allStarts = bars.map((b) => b.startDate.getTime());
                const allEnds = bars.map((b) => b.endDate.getTime());
                const rangeStart = new Date(Math.min(...allStarts));
                const rangeEnd = new Date(Math.max(...allEnds));
                rangeStart.setDate(rangeStart.getDate() - 14);
                rangeEnd.setDate(rangeEnd.getDate() + 14);
                return monthLabels(rangeStart, rangeEnd).map((m, i) => (
                  <span
                    key={i}
                    className="absolute text-[11px] text-slate-400 font-medium whitespace-nowrap"
                    style={{ left: `${m.offsetPct}%`, top: 0 }}
                  >
                    {m.label}
                  </span>
                ));
              })()}
            </div>
          </div>

          {/* Bars */}
          <div className="relative">
            {(() => {
              const allStarts = bars.map((b) => b.startDate.getTime());
              const allEnds = bars.map((b) => b.endDate.getTime());
              const rangeStart = new Date(Math.min(...allStarts));
              const rangeEnd = new Date(Math.max(...allEnds));
              rangeStart.setDate(rangeStart.getDate() - 14);
              rangeEnd.setDate(rangeEnd.getDate() + 14);
              const totalDays = daysBetween(rangeStart, rangeEnd);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayPct = (daysBetween(rangeStart, today) / totalDays) * 100;

              return (
                <>
                  {/* Today marker */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-red-300 z-10 pointer-events-none"
                      style={{ left: `calc(192px + (100% - 192px) * ${todayPct / 100})` }}
                    >
                      <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-red-400 font-medium whitespace-nowrap">
                        Today
                      </span>
                    </div>
                  )}

                  {bars.map((bar, idx) => {
                    const leftPct =
                      (daysBetween(rangeStart, bar.startDate) / totalDays) * 100;
                    const widthPct =
                      (daysBetween(bar.startDate, bar.endDate) / totalDays) * 100;
                    const color = colors[idx % colors.length];

                    return (
                      <div key={bar.project.id} className="flex items-center h-12 group">
                        {/* Project name */}
                        <div className="w-48 shrink-0 pr-3">
                          <Link
                            to={`/projects/${bar.project.id}`}
                            className="text-sm font-medium text-slate-700 hover:text-blue-600 truncate block"
                            title={bar.project.name}
                          >
                            {bar.project.name}
                          </Link>
                          <div className="text-[10px] text-slate-400">
                            {fmtShort(bar.startDate)} &ndash; {fmtShort(bar.endDate)}
                          </div>
                        </div>

                        {/* Timeline area */}
                        <div className="flex-1 relative h-7">
                          <div
                            className={`absolute top-1 h-5 rounded-full ${color.bg} overflow-hidden cursor-pointer group-hover:ring-2 group-hover:ring-blue-300 transition-shadow`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 1)}%`,
                            }}
                            title={`${bar.project.name}: ${bar.progress}% complete`}
                          >
                            {/* Filled portion */}
                            <div
                              className={`h-full ${color.fill} rounded-full transition-all`}
                              style={{ width: `${bar.progress}%` }}
                            />
                            {/* Label */}
                            {widthPct > 5 && (
                              <span
                                className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${color.text}`}
                              >
                                {bar.progress}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
