import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEngineer, useKanban, useUpdateEngineer } from "../hooks/useEngineers";
import KanbanBoard from "../components/KanbanBoard";
import { useProjects } from "../hooks/useProjects";
import { useSyncAll } from "../hooks/useSync";
import { Save, Globe, Palmtree, X, RefreshCw } from "lucide-react";
import { TIMEZONES, formatTzLabel } from "../utils/timezones";

export default function EngineerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const engineerId = Number(id);

  const { data: engineer, isLoading } = useEngineer(engineerId);
  const { data: kanbanData } = useKanban(engineerId);
  const { data: projects = [] } = useProjects();
  const updateEngineer = useUpdateEngineer();
  const syncAll = useSyncAll();

  const [editTags, setEditTags] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState<string | null>(null);
  const [editTimezone, setEditTimezone] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState<string | null>(null);
  const [editOooStart, setEditOooStart] = useState<string | null>(null);
  const [editOooEnd, setEditOooEnd] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-slate-400">Loading...</div>;
  if (!engineer) return <div className="text-red-500">Engineer not found.</div>;

  const isEditing =
    editTags !== null ||
    editLocation !== null ||
    editTimezone !== null ||
    editCapacity !== null ||
    editOooStart !== null ||
    editOooEnd !== null;

  const handleSaveProfile = () => {
    const data: Record<string, unknown> = {};
    if (editTags !== null) {
      data.manual_tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    if (editLocation !== null) {
      data.location = editLocation;
    }
    if (editTimezone !== null) {
      data.timezone = editTimezone;
    }
    if (editCapacity !== null) {
      data.sprint_capacity = parseFloat(editCapacity) || 7;
    }
    if (editOooStart !== null || editOooEnd !== null) {
      data.ooo_start = editOooStart ?? engineer.ooo_start ?? "";
      data.ooo_end = editOooEnd ?? engineer.ooo_end ?? "";
    }
    updateEngineer.mutate(
      { id: engineerId, data: data as Parameters<typeof updateEngineer.mutate>[0]["data"] },
      {
        onSuccess: () => {
          setEditTags(null);
          setEditLocation(null);
          setEditTimezone(null);
          setEditCapacity(null);
          setEditOooStart(null);
          setEditOooEnd(null);
        },
      }
    );
  };

  const handleClearOoo = () => {
    updateEngineer.mutate({
      id: engineerId,
      data: { ooo_start: "", ooo_end: "" },
    });
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOoo =
    engineer.ooo_start &&
    engineer.ooo_end &&
    engineer.ooo_start <= today &&
    today <= engineer.ooo_end;

  const doneTickets = engineer.tickets.filter(
    (t) => t.status.toLowerCase() === "done" || t.status.toLowerCase() === "closed" || t.status.toLowerCase() === "ready for prod release"
  );

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-semibold">
            {engineer.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">
                {engineer.name}
              </h1>
              {isOoo && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  <Palmtree size={12} /> OOO until {engineer.ooo_end}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {engineer.jira_account_id}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="text-slate-400 block mb-1">Location</label>
            {editLocation !== null ? (
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
              />
            ) : (
              <div
                className="cursor-pointer hover:text-blue-600"
                onClick={() => setEditLocation(engineer.location || "")}
              >
                {engineer.location || "Click to set"}
              </div>
            )}
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Timezone</label>
            {editTimezone !== null ? (
              <select
                value={editTimezone}
                onChange={(e) => setEditTimezone(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
              >
                <option value="">Select timezone...</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="cursor-pointer hover:text-blue-600 flex items-center gap-1"
                onClick={() => setEditTimezone(engineer.timezone || "")}
              >
                <Globe size={14} className="text-slate-400" />
                {engineer.timezone ? formatTzLabel(engineer.timezone) : "Click to set"}
              </div>
            )}
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Sprint Capacity (pts)</label>
            {editCapacity !== null ? (
              <input
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-24"
              />
            ) : (
              <div
                className="cursor-pointer hover:text-blue-600"
                onClick={() =>
                  setEditCapacity(String(engineer.sprint_capacity))
                }
              >
                {engineer.sprint_capacity} pts
              </div>
            )}
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Manual Tags</label>
            {editTags !== null ? (
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
              />
            ) : (
              <div
                className="cursor-pointer hover:text-blue-600"
                onClick={() =>
                  setEditTags(engineer.manual_tags.join(", "))
                }
              >
                {engineer.manual_tags.length > 0
                  ? engineer.manual_tags.join(", ")
                  : "Click to add tags"}
              </div>
            )}
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Current Project</label>
            <select
              value={engineer.current_project_id ?? 0}
              onChange={(e) => {
                updateEngineer.mutate({
                  id: engineerId,
                  data: { current_project_id: Number(e.target.value) },
                });
              }}
              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value={0}>None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OOO This Sprint */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="text-slate-400 text-sm block mb-2">OOO This Sprint</label>
          {engineer.ooo_start && engineer.ooo_end && editOooStart === null && editOooEnd === null ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                <Palmtree size={14} />
                {engineer.ooo_start} to {engineer.ooo_end}
              </span>
              <button
                onClick={() => {
                  setEditOooStart(engineer.ooo_start || "");
                  setEditOooEnd(engineer.ooo_end || "");
                }}
                className="text-xs text-slate-400 hover:text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={handleClearOoo}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-0.5"
              >
                <X size={12} /> Clear
              </button>
            </div>
          ) : editOooStart !== null || editOooEnd !== null ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={editOooStart ?? ""}
                onChange={(e) => setEditOooStart(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={editOooEnd ?? ""}
                onChange={(e) => setEditOooEnd(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setEditOooStart("");
                setEditOooEnd("");
              }}
              className="text-sm text-slate-500 hover:text-blue-600 cursor-pointer"
            >
              + Set OOO dates
            </button>
          )}
        </div>

        {isEditing && (
          <button
            onClick={handleSaveProfile}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Save size={14} /> Save Changes
          </button>
        )}

        {/* Tags Display */}
        <div className="flex flex-wrap gap-1 mt-4">
          {engineer.auto_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600"
            >
              {tag}
            </span>
          ))}
          {engineer.manual_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">In-Flight Tickets</h2>
          <button
            onClick={() => syncAll.mutate()}
            disabled={syncAll.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncAll.isPending ? "animate-spin" : ""} />
            {syncAll.isPending ? "Syncing..." : "Sync"}
          </button>
        </div>
        {kanbanData ? (
          <KanbanBoard data={kanbanData} />
        ) : (
          <div className="text-sm text-slate-400">Loading...</div>
        )}
      </div>

      {/* Ticket History */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-700 mb-3">
          Completed Tickets ({doneTickets.length})
        </h2>
        {doneTickets.length > 0 ? (
          <div className="space-y-1">
            {doneTickets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm"
              >
                <div>
                  <a
                    href={`https://collectors.atlassian.net/browse/${t.jira_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-600 hover:underline mr-2"
                  >
                    {t.jira_key}
                  </a>
                  {t.title}
                </div>
                {t.points != null && (
                  <span className="text-slate-400">{t.points} pts</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No completed tickets.</div>
        )}
      </div>
    </div>
  );
}
