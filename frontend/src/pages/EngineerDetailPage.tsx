import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEngineer, useKanban, useUpdateEngineer } from "../hooks/useEngineers";
import KanbanBoard from "../components/KanbanBoard";
import { Save } from "lucide-react";

export default function EngineerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const engineerId = Number(id);

  const { data: engineer, isLoading } = useEngineer(engineerId);
  const { data: kanbanData } = useKanban(engineerId);
  const updateEngineer = useUpdateEngineer();

  const [editTags, setEditTags] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-slate-400">Loading...</div>;
  if (!engineer) return <div className="text-red-500">Engineer not found.</div>;

  const handleSaveProfile = () => {
    const data: {
      manual_tags?: string[];
      weekly_hours?: number;
      location?: string;
    } = {};
    if (editTags !== null) {
      data.manual_tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    if (editHours !== null) {
      data.weekly_hours = parseFloat(editHours) || 40;
    }
    if (editLocation !== null) {
      data.location = editLocation;
    }
    updateEngineer.mutate(
      { id: engineerId, data },
      {
        onSuccess: () => {
          setEditTags(null);
          setEditHours(null);
          setEditLocation(null);
        },
      }
    );
  };

  const doneTickets = engineer.tickets.filter(
    (t) => t.status.toLowerCase() === "done" || t.status.toLowerCase() === "closed"
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
            <h1 className="text-2xl font-bold text-slate-800">
              {engineer.name}
            </h1>
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
            <label className="text-slate-400 block mb-1">Weekly Hours</label>
            {editHours !== null ? (
              <input
                type="number"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-sm w-24"
              />
            ) : (
              <div
                className="cursor-pointer hover:text-blue-600"
                onClick={() =>
                  setEditHours(String(engineer.weekly_hours))
                }
              >
                {engineer.weekly_hours}h
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
        </div>

        {(editTags !== null ||
          editHours !== null ||
          editLocation !== null) && (
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
        <h2 className="font-semibold text-slate-700 mb-3">In-Flight Tickets</h2>
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
                  <span className="font-mono text-blue-600 mr-2">
                    {t.jira_key}
                  </span>
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
