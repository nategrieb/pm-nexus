import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject } from "../api/projects";
import { getTickets, getGapAnalysis } from "../api/tickets";
import { createEpic, deleteEpic } from "../api/epics";
import { createDocument, deleteDocument } from "../api/documents";
import { getEngineers } from "../api/engineers";
import ProgressBar from "../components/ProgressBar";
import SyncButton from "../components/SyncButton";
import TicketTable from "../components/TicketTable";
import ForecastCard from "../components/ForecastCard";
import { Plus, Trash2, ExternalLink } from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
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

  const [epicKey, setEpicKey] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docType, setDocType] = useState("PRD");

  const addEpic = useMutation({
    mutationFn: () =>
      createEpic({ epic_key: epicKey.trim(), project_id: projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      setEpicKey("");
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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      setDocUrl("");
    },
  });

  const removeDoc = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["projects", projectId] }),
  });

  if (isLoading)
    return <div className="text-sm text-slate-400">Loading...</div>;
  if (!project) return <div className="text-red-500">Project not found.</div>;

  const projectEngineers = allEngineers.filter((e) =>
    project.engineer_ids.includes(e.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                project.status === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {project.status}
            </span>
            {project.target_date && <span>Target: {project.target_date}</span>}
          </div>
        </div>
        <SyncButton projectId={projectId} />
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <ProgressBar
          completed={project.completed_points}
          total={project.total_points}
        />
      </div>

      {/* Forecast */}
      <ForecastCard projectId={projectId} />

      {/* Epics */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Epics</h2>
        <div className="space-y-2 mb-3">
          {project.epics.map((epic) => (
            <div
              key={epic.id}
              className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
            >
              <div>
                <span className="font-mono text-sm text-blue-600">
                  {epic.epic_key}
                </span>
                {epic.summary && (
                  <span className="text-sm text-slate-500 ml-2">
                    {epic.summary}
                  </span>
                )}
              </div>
              <button
                onClick={() => removeEpic.mutate(epic.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="PROJ-123"
            value={epicKey}
            onChange={(e) => setEpicKey(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && epicKey.trim() && addEpic.mutate()}
          />
          <button
            onClick={() => epicKey.trim() && addEpic.mutate()}
            disabled={addEpic.isPending}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
          >
            <Plus size={14} /> Add Epic
          </button>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Documents</h2>
        <div className="space-y-2 mb-3">
          {project.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    doc.doc_type === "PRD"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {doc.doc_type}
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {doc.url.length > 60
                    ? doc.url.substring(0, 60) + "..."
                    : doc.url}
                  <ExternalLink size={12} />
                </a>
              </div>
              <button
                onClick={() => removeDoc.mutate(doc.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="PRD">PRD</option>
            <option value="TRD">TRD</option>
          </select>
          <input
            type="url"
            placeholder="https://..."
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => docUrl.trim() && addDoc.mutate()}
            disabled={addDoc.isPending}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Engineer Roster */}
      {projectEngineers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-700 mb-3">Engineer Roster</h2>
          <div className="flex flex-wrap gap-2">
            {projectEngineers.map((eng) => (
              <Link
                key={eng.id}
                to={`/engineers/${eng.id}`}
                className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                  {eng.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{eng.name}</div>
                  {eng.location && (
                    <div className="text-xs text-slate-400">{eng.location}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tickets */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">
            Tickets ({tickets.length})
          </h2>
          {gaps.length > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 rounded-full px-3 py-1">
              {gaps.length} gap(s) found
            </span>
          )}
        </div>
        <TicketTable tickets={tickets} gaps={gaps} />
      </div>
    </div>
  );
}
