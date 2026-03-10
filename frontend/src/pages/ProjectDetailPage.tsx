import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject, deleteProject, updateProject } from "../api/projects";
import { getTickets, getGapAnalysis } from "../api/tickets";
import { createEpic, deleteEpic, getEpics, moveEpic } from "../api/epics";
import { createDocument, deleteDocument } from "../api/documents";
import { createDependency, deleteDependency } from "../api/dependencies";
import { getEngineers } from "../api/engineers";
import { getForecast } from "../api/forecast";
import { getSettings } from "../api/settings";
import SyncButton from "../components/SyncButton";
import TicketTable from "../components/TicketTable";
import {
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Users,
  Link2,
} from "lucide-react";

const PROJECT_STATUSES = ["Pending", "Scoping", "In Progress", "Complete"];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-600",
  Scoping: "bg-purple-100 text-purple-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Complete: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};

/** Try to extract a human-friendly title from known URL patterns. */
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);

    // Confluence: .../display/SPACE/Page+Title or .../wiki/spaces/SPACE/pages/.../Page+Title
    if (u.hostname.includes("atlassian.net") || u.hostname.includes("confluence")) {
      const wikiMatch = u.pathname.match(/\/pages\/\d+\/(.+?)$/);
      if (wikiMatch) return decodeURIComponent(wikiMatch[1].replace(/\+/g, " "));
      const dispMatch = u.pathname.match(/\/display\/[^/]+\/(.+?)$/);
      if (dispMatch) return decodeURIComponent(dispMatch[1].replace(/\+/g, " "));
    }

    // Google Docs / Sheets / Slides / Drive
    if (u.hostname === "docs.google.com") {
      if (u.pathname.includes("/document/")) return "Google Doc";
      if (u.pathname.includes("/spreadsheets/")) return "Google Sheet";
      if (u.pathname.includes("/presentation/")) return "Google Slides";
    }
    if (u.hostname === "drive.google.com") return "Google Drive File";
  } catch {
    // invalid URL — ignore
  }
  return "";
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => getProject(projectId),
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets", { project_id: projectId }],
    queryFn: () => getTickets({ project_id: projectId }),
  });

  const { data: gaps = [] } = useQuery({
    queryKey: ["gap-analysis", projectId],
    queryFn: () => getGapAnalysis(projectId),
  });

  const { data: allEngineers = [] } = useQuery({
    queryKey: ["engineers"],
    queryFn: getEngineers,
  });

  const { data: forecast } = useQuery({
    queryKey: ["forecast", projectId],
    queryFn: () => getForecast(projectId),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const jiraBaseUrl = settings.find((s) => s.key === "jira_base_url")?.value ?? "";

  const { data: allEpics = [] } = useQuery({
    queryKey: ["epics"],
    queryFn: () => getEpics(),
  });

  const [epicKey, setEpicKey] = useState("");
  const [epicDropdownOpen, setEpicDropdownOpen] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("PRD");
  const [addingDoc, setAddingDoc] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(true);
  const [epicsOpen, setEpicsOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);
  const [depName, setDepName] = useState("");

  const addEpic = useMutation({
    mutationFn: async (key: string) => {
      const existing = allEpics.find((e) => e.epic_key === key);
      if (existing) {
        return moveEpic(existing.id, projectId);
      }
      return createEpic({ epic_key: key, project_id: projectId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["epics"] });
      setEpicKey("");
      setEpicDropdownOpen(false);
    },
  });

  const removeEpic = useMutation({
    mutationFn: deleteEpic,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["projects", projectId] }),
  });

  const addDoc = useMutation({
    mutationFn: () =>
      createDocument({
        project_id: projectId,
        doc_type: docType,
        url: docUrl.trim(),
        title: docTitle.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      setDocUrl("");
      setDocTitle("");
      setAddingDoc(false);
    },
  });

  const removeDoc = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["projects", projectId] }),
  });

  const addDep = useMutation({
    mutationFn: () =>
      createDependency({ project_id: projectId, team_name: depName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDepName("");
    },
  });

  const removeDep = useMutation({
    mutationFn: deleteDependency,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const saveProject = useMutation({
    mutationFn: (data: Parameters<typeof updateProject>[1]) =>
      updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  if (isLoading)
    return <div className="text-sm text-slate-400">Loading...</div>;
  if (!project) return <div className="text-red-500">Project not found.</div>;

  const projectEngineers = allEngineers.filter((e) =>
    project.engineer_ids.includes(e.id)
  );

  const engineerMap = new Map(allEngineers.map((e) => [e.id, e.name]));

  const DONE_STATUSES = ["done", "closed", "cancelled", "canceled"];
  const activeTickets = tickets.filter(
    (t) => !DONE_STATUSES.includes(t.status.toLowerCase())
  );
  const closedTickets = tickets.filter((t) =>
    DONE_STATUSES.includes(t.status.toLowerCase())
  );

  const pct = project.total_points > 0
    ? Math.round((project.completed_points / project.total_points) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <select
              value={project.status}
              onChange={(e) => saveProject.mutate({ status: e.target.value })}
              className={`px-2 py-0.5 rounded text-xs font-medium border-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                STATUS_COLORS[project.status] ?? "bg-slate-100 text-slate-500"
              }`}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton projectId={projectId} />
          <button
            onClick={() => {
              if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                deleteProject(projectId).then(() => {
                  qc.invalidateQueries({ queryKey: ["projects"] });
                  navigate("/");
                });
              }
            }}
            className="flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* ── Project Info Bar ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {/* Compact progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0">
            {project.completed_points}/{project.total_points} pts ({pct}%)
            {forecast && forecast.unpointed_count > 0 && (
              <span className="text-amber-500 ml-1">
                · est. {forecast.total_points} pts
              </span>
            )}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <DateCard
            label="Start Date"
            value={project.start_date}
            onChange={(v) => saveProject.mutate({ start_date: v })}
          />
          <QuarterDropdown
            value={project.quarters ?? []}
            onChange={(q) => saveProject.mutate({ quarters: q })}
            startDate={project.start_date}
            targetDate={project.target_date}
          />
          {forecast && (
            <StatCard
              label="Remaining"
              value={`${forecast.remaining_points} pts`}
              sub={forecast.weeks_to_completion != null ? `~${forecast.weeks_to_completion} wks` : undefined}
            />
          )}
          <DateCard
            label="Est. End"
            value={forecast?.calculated_end_date ?? null}
            readOnly
          />
          <DateCard
            label="Target Date"
            value={project.target_date}
            onChange={(v) => saveProject.mutate({ target_date: v })}
            highlight
          />
        </div>
        {forecast && forecast.unpointed_count > 0 && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mt-3">
            {forecast.unpointed_count} unpointed ticket(s) buffered at{" "}
            {forecast.buffer_per_ticket} pts each
          </div>
        )}
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tickets (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Tickets */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700">
                Active Tickets ({activeTickets.length})
              </h2>
              {gaps.length > 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 rounded-full px-3 py-1">
                  {gaps.length} gap(s) found
                </span>
              )}
            </div>
            <TicketTable tickets={activeTickets} gaps={gaps} engineerMap={engineerMap} />
          </div>

          {/* Closed Tickets */}
          {closedTickets.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <button
                onClick={() => setClosedOpen(!closedOpen)}
                className="flex items-center gap-2 font-semibold text-slate-500 hover:text-slate-700 text-sm"
              >
                {closedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Closed / Done ({closedTickets.length})
              </button>
              {closedOpen && (
                <div className="mt-3 opacity-70">
                  <TicketTable tickets={closedTickets} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar (1/3 width) */}
        <div className="space-y-5">
          {/* Documents */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <button
              onClick={() => setDocsOpen(!docsOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <FileText size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm flex-1">
                Documents ({project.documents.length})
              </h3>
              {docsOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {docsOpen && (
              <div className="mt-3 space-y-2">
                {project.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 group py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
                        doc.doc_type === "PRD"
                          ? "bg-blue-100 text-blue-700"
                          : doc.doc_type === "TRD"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {doc.doc_type}
                    </span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate flex-1"
                      title={doc.url}
                    >
                      {doc.title || (doc.url.length > 40 ? doc.url.substring(0, 40) + "..." : doc.url)}
                    </a>
                    <ExternalLink size={11} className="text-slate-300 shrink-0" />
                    <button
                      onClick={() => removeDoc.mutate(doc.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Add Document Form */}
                {addingDoc ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex gap-1.5">
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs"
                      >
                        <option value="PRD">PRD</option>
                        <option value="TRD">TRD</option>
                        <option value="Supporting">Supporting</option>
                        <option value="Runbook">Runbook</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={docUrl}
                        onChange={(e) => {
                          setDocUrl(e.target.value);
                          if (!docTitle) {
                            const suggested = titleFromUrl(e.target.value);
                            if (suggested) setDocTitle(suggested);
                          }
                        }}
                        className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Link name (e.g. 'Auth PRD v2')"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === "Enter" && docUrl.trim() && addDoc.mutate()}
                      />
                      <button
                        onClick={() => docUrl.trim() && addDoc.mutate()}
                        disabled={addDoc.isPending}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setAddingDoc(false); setDocUrl(""); setDocTitle(""); }}
                        className="px-2 py-1 text-slate-400 rounded text-xs hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setAddingDoc(true)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Plus size={12} /> Add document
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Epics */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <button
              onClick={() => setEpicsOpen(!epicsOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Layers size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm flex-1">
                Epics ({project.epics.length})
              </h3>
              {epicsOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {epicsOpen && (
              <div className="mt-3 space-y-1">
                {project.epics.map((epic) => (
                  <div
                    key={epic.id}
                    className="flex items-center gap-2 group py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50"
                  >
                    <a
                      href={jiraBaseUrl ? `${jiraBaseUrl.replace(/\/$/, "")}/browse/${epic.epic_key}` : `#`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-600 hover:underline shrink-0"
                    >
                      {epic.epic_key}
                    </a>
                    <span className="text-sm text-slate-600 truncate flex-1">
                      {epic.summary}
                    </span>
                    <a
                      href={jiraBaseUrl ? `${jiraBaseUrl.replace(/\/$/, "")}/browse/${epic.epic_key}` : `#`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => removeEpic.mutate(epic.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="relative pt-2 border-t border-slate-100">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Search epics or enter key..."
                      value={epicKey}
                      onChange={(e) => {
                        setEpicKey(e.target.value);
                        setEpicDropdownOpen(e.target.value.length > 0);
                      }}
                      onFocus={() => epicKey.length > 0 && setEpicDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && epicKey.trim()) {
                          addEpic.mutate(epicKey.trim());
                        } else if (e.key === "Escape") {
                          setEpicDropdownOpen(false);
                        }
                      }}
                      className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => epicKey.trim() && addEpic.mutate(epicKey.trim())}
                      disabled={addEpic.isPending}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200 shrink-0"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {epicDropdownOpen && (() => {
                    const currentEpicKeys = new Set(project.epics.map((e) => e.epic_key));
                    const words = epicKey.toLowerCase().split(/\s+/).filter(Boolean);
                    const filtered = allEpics
                      .filter((e) => !currentEpicKeys.has(e.epic_key))
                      .filter((e) => {
                        const haystack = `${e.epic_key} ${e.summary ?? ""}`.toLowerCase();
                        return words.every((w) => haystack.includes(w));
                      })
                      .slice(0, 10);
                    if (filtered.length === 0) return null;
                    return (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filtered.map((e) => (
                          <button
                            key={e.id}
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              addEpic.mutate(e.epic_key);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-xs"
                          >
                            <span className="font-mono text-blue-600 shrink-0">{e.epic_key}</span>
                            <span className="text-slate-500 truncate">{e.summary}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm">
                Dependencies ({project.dependencies.length})
              </h3>
            </div>
            <div className="space-y-1.5">
              {project.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center gap-2 group py-1 px-2 -mx-2 rounded-lg hover:bg-slate-50"
                >
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                    {dep.team_name}
                  </span>
                  <button
                    onClick={() => removeDep.mutate(dep.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Team name (e.g. Platform)"
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && depName.trim() && addDep.mutate()}
                />
                <button
                  onClick={() => depName.trim() && addDep.mutate()}
                  disabled={addDep.isPending}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200 shrink-0"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Team */}
          {projectEngineers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <button
                onClick={() => setTeamOpen(!teamOpen)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Users size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-700 text-sm flex-1">
                  Team ({projectEngineers.length})
                </h3>
                {teamOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>
              {teamOpen && (
                <div className="mt-3 space-y-1">
                  {projectEngineers.map((eng) => (
                    <Link
                      key={eng.id}
                      to={`/engineers/${eng.id}`}
                      className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {eng.name.charAt(0)}
                      </div>
                      <span className="text-sm text-slate-700">{eng.name}</span>
                      {eng.location && (
                        <span className="text-xs text-slate-400 ml-auto">{eng.location}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small Components ───

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

const currentYear = new Date().getFullYear();
const DATE_MIN = `${currentYear - 1}-01-01`;
const DATE_MAX = `${currentYear + 2}-12-31`;

/** Get quarter string for a date like "2026 Q1". */
function dateToQuarter(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y} Q${Math.ceil(m / 3)}`;
}

/** Get all quarters between two quarter strings inclusive. */
function quartersBetween(startQ: string, endQ: string): string[] {
  const [sy, sq] = [parseInt(startQ.split(" ")[0]), parseInt(startQ.split("Q")[1])];
  const [ey, eq] = [parseInt(endQ.split(" ")[0]), parseInt(endQ.split("Q")[1])];
  const result: string[] = [];
  let y = sy, q = sq;
  while (y < ey || (y === ey && q <= eq)) {
    result.push(`${y} Q${q}`);
    q++;
    if (q > 4) { q = 1; y++; }
  }
  return result;
}

function generateQuarterOptions(): string[] {
  const opts: string[] = [];
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    for (let q = 1; q <= 4; q++) {
      opts.push(`${y} Q${q}`);
    }
  }
  return opts;
}

const QUARTER_OPTIONS = generateQuarterOptions();

function QuarterDropdown({
  value,
  onChange,
  startDate,
  targetDate,
}: {
  value: string[];
  onChange: (quarters: string[]) => void;
  startDate: string | null;
  targetDate: string | null;
}) {
  const [open, setOpen] = useState(false);

  // Auto-compute quarters from dates
  const autoQuarters = startDate && targetDate
    ? quartersBetween(dateToQuarter(startDate), dateToQuarter(targetDate))
    : startDate
      ? [dateToQuarter(startDate)]
      : [];

  const handleAutoFill = () => {
    if (autoQuarters.length > 0) {
      onChange(autoQuarters);
    }
  };

  const toggle = (q: string) => {
    const next = value.includes(q) ? value.filter((v) => v !== q) : [...value, q];
    onChange(next);
  };

  const display = value.length > 0
    ? value.map((q) => q.replace(/^\d+ /, "")).join(", ")
    : "—";

  return (
    <div className="text-center relative">
      <div className="text-xs text-slate-400 mb-0.5">Quarters</div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-2 py-0.5 w-full hover:bg-slate-50 transition-colors"
      >
        {display}
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[180px]">
          {autoQuarters.length > 0 && (
            <button
              onClick={() => { handleAutoFill(); setOpen(false); }}
              className="w-full text-left text-xs text-blue-600 hover:bg-blue-50 rounded px-2 py-1.5 mb-1 font-medium"
            >
              Auto-fill from dates ({autoQuarters.map((q) => q.replace(/^\d+ /, "")).join("–")})
            </button>
          )}
          <div className="max-h-48 overflow-y-auto">
            {QUARTER_OPTIONS.map((q) => (
              <label
                key={q}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={value.includes(q)}
                  onChange={() => toggle(q)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">{q}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-1.5 mt-1 border-t border-slate-100"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function DateCard({
  label,
  value,
  onChange,
  highlight,
  readOnly,
}: {
  label: string;
  value: string | null;
  onChange?: (v: string | null) => void;
  highlight?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      {readOnly ? (
        <div className={`text-sm font-semibold ${value ? "text-slate-800" : "text-slate-300"}`}>
          {value ?? "—"}
        </div>
      ) : (
        <input
          type="date"
          value={value ?? ""}
          min={DATE_MIN}
          max={DATE_MAX}
          onChange={(e) => onChange?.(e.target.value || null)}
          className={`w-full text-center text-sm font-semibold bg-transparent border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer ${
            highlight ? "text-blue-600" : "text-slate-800"
          }`}
        />
      )}
    </div>
  );
}
