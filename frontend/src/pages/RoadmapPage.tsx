import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { ExternalLink } from "lucide-react";
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

/** Get exactly the start and end Date bounds of a quarter. */
function getQuarterDates(year: number, q: number): { start: Date; end: Date } {
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // 0th day of next month = last day of this month
  return { start, end };
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

/** Get the exact start/end Date range for drawing boundary lines. */
function getFilterDateRange(filter: string): { start: Date; end: Date } | null {
  const { year, quarter } = getCurrentQuarter();

  switch (filter) {
    case "this_quarter":
      return getQuarterDates(year, quarter);
    case "next_quarter": {
      const nq = advanceQuarter(year, quarter, 1);
      return getQuarterDates(nq.year, nq.quarter);
    }
    case "this_half": {
      const halfStart = quarter <= 2 ? 1 : 3;
      return {
        start: getQuarterDates(year, halfStart).start,
        end: getQuarterDates(year, halfStart + 1).end,
      };
    }
    case "next_half": {
      const curHalfStart = quarter <= 2 ? 1 : 3;
      const nhStart = advanceQuarter(year, curHalfStart, 2);
      const nhEnd = advanceQuarter(nhStart.year, nhStart.quarter, 1);
      return {
        start: getQuarterDates(nhStart.year, nhStart.quarter).start,
        end: getQuarterDates(nhEnd.year, nhEnd.quarter).end,
      };
    }
    case "full_year":
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
    default:
      return null;
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
  const filterRange = getFilterDateRange(filter);

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

      // End date: prefer target_date, fallback to forecast_end_date, fallback start+12 weeks
      let endDate: Date;
      if (p.target_date) {
        endDate = parseDate(p.target_date);
      } else if (p.forecast_end_date) {
        endDate = parseDate(p.forecast_end_date);
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

  // Calculate master timeline range
  let rangeStart = new Date();
  let rangeEnd = new Date();
  let totalDays = 1;

  if (filterRange && filter !== "all") {
    // 1. FIXED VIEWPORT: Lock the timeline purely to the quarter being viewed
    rangeStart = new Date(filterRange.start);
    rangeEnd = new Date(filterRange.end);
    
    // Add 1 month of padding on each side to see spillover
    rangeStart.setMonth(rangeStart.getMonth() - 1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    totalDays = daysBetween(rangeStart, rangeEnd);
  } else if (bars.length > 0) {
    // 2. EXPANDED VIEWPORT ("All" filter): Expand to fit all project dates
    let minDate = Math.min(...bars.map((b) => b.startDate.getTime()));
    let maxDate = Math.max(...bars.map((b) => b.endDate.getTime()));

    rangeStart = new Date(minDate);
    rangeEnd = new Date(maxDate);
    
    // Add 1 month of padding on each side
    rangeStart.setMonth(rangeStart.getMonth() - 1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    totalDays = daysBetween(rangeStart, rangeEnd);
  }

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Roadmap</h1>
            <a
              href="https://docs.google.com/spreadsheets/d/1u_Ou2KJ9OqDMcmD-HWTPJ3QRfKNaNZEge739EXGjQhQ/edit?gid=198620259#gid=198620259"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
            >
              <ExternalLink size={14} />
              Product Roadmap
            </a>
          </div>
          {filterQuarterLabel && (
            <p className="text-xs text-slate-400 mt-1">{filterQuarterLabel}</p>
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto relative">
          {/* Month labels header */}
          <div className="flex">
            <div className="w-64 shrink-0 flex items-end pb-1 pr-3 border-b border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Project
              </span>
            </div>
            <div className="flex-1 relative h-6 border-b border-slate-100">
              {monthLabels(rangeStart, rangeEnd).map((m, i) => (
                <span
                  key={i}
                  className="absolute text-[11px] text-slate-400 font-medium whitespace-nowrap"
                  style={{ left: `${m.offsetPct}%`, top: 0 }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Timeline Body */}
          <div className="relative pt-8 pb-4">
            
            {/* Filter Boundaries & Shaded Area */}
            {filterRange && (() => {
              const clampedStart = new Date(Math.max(rangeStart.getTime(), filterRange.start.getTime()));
              const clampedEnd = new Date(Math.min(rangeEnd.getTime(), filterRange.end.getTime()));
              const shadeLeftPct = (daysBetween(rangeStart, clampedStart) / totalDays) * 100;
              const shadeWidthPct = (daysBetween(clampedStart, clampedEnd) / totalDays) * 100;

              const startPct = (daysBetween(rangeStart, filterRange.start) / totalDays) * 100;
              const endPct = (daysBetween(rangeStart, filterRange.end) / totalDays) * 100;

              return (
                <>
                  {/* Shaded Area */}
                  <div
                    className="absolute top-6 bottom-0 bg-blue-50/40 z-0 pointer-events-none border-x border-blue-100/50"
                    style={{
                      left: `calc(256px + (100% - 256px) * ${shadeLeftPct / 100})`,
                      width: `calc((100% - 256px) * ${shadeWidthPct / 100})`,
                    }}
                  />
                  {/* Start Line */}
                  {startPct >= 0 && startPct <= 100 && (
                    <div
                      className="absolute top-2 bottom-0 w-px border-l-2 border-blue-400 z-10 pointer-events-none"
                      style={{ left: `calc(256px + (100% - 256px) * ${startPct / 100})` }}
                    >
                      <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-blue-700 font-bold whitespace-nowrap bg-white px-2 py-0.5 rounded-full border border-blue-200">
                        {currentFilterLabel}
                      </span>
                    </div>
                  )}
                  {/* End Line */}
                  {endPct >= 0 && endPct <= 100 && (
                    <div
                      className="absolute top-2 bottom-0 w-px border-l-2 border-dashed border-blue-300 z-10 pointer-events-none"
                      style={{ left: `calc(256px + (100% - 256px) * ${endPct / 100})` }}
                    >
                      <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-blue-500 font-semibold whitespace-nowrap bg-white px-1.5 py-0.5 rounded-full border border-blue-100">
                        End
                      </span>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Today marker */}
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayPct = (daysBetween(rangeStart, today) / totalDays) * 100;
              
              if (todayPct >= 0 && todayPct <= 100) {
                return (
                  <div
                    className="absolute top-2 bottom-0 w-px border-l-2 border-red-400 z-20 pointer-events-none"
                    style={{ left: `calc(256px + (100% - 256px) * ${todayPct / 100})` }}
                  >
                    <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-red-500 font-bold whitespace-nowrap bg-white px-1.5 py-0.5 rounded-full border border-red-200">
                      Today
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Project Bars */}
            {bars.map((bar, idx) => {
              const leftPct = (daysBetween(rangeStart, bar.startDate) / totalDays) * 100;
              const widthPct = (daysBetween(bar.startDate, bar.endDate) / totalDays) * 100;
              const color = colors[idx % colors.length];

              return (
                <div key={bar.project.id} className="flex items-center h-12 group relative z-10 hover:bg-slate-50/50 rounded-lg">
                  {/* Project name */}
                  <div className="w-64 shrink-0 pr-3 pl-1">
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

                  {/* Timeline area with overflow-hidden to cleanly clip out-of-bounds bars */}
                  <div className="flex-1 relative h-7 overflow-hidden">
                    <div
                      className={`absolute top-1 h-5 rounded-full ${color.bg} overflow-hidden cursor-pointer group-hover:ring-2 group-hover:ring-blue-300 transition-shadow`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 0.5)}%`,
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
          </div>
        </div>
      )}
    </div>
  );
}