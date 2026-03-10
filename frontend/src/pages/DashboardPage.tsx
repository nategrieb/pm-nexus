import { useState } from "react";
import type { DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  useProjects,
  useUpdateProject,
  useCreateProject,
  useMergeProjects,
  useDeleteProject,
} from "../hooks/useProjects";
import { useEpics, useMoveEpic } from "../hooks/useEpics";
import {
  FolderOpen,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Eye,
  Plus,
  ListMusic,
  GripVertical,
  Search,
  ArrowUpDown,
  Calendar,
  Link2,
  Merge,
  Trash2,
  X,
  Check,
} from "lucide-react";
import type { Project, Epic } from "../types";

const INACTIVE_STATUSES = ["inactive", "Complete"];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-600",
  Scoping: "bg-purple-100 text-purple-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Complete: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: allEpics, isLoading: epicsLoading } = useEpics();
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();
  const moveEpic = useMoveEpic();
  const mergeProjects = useMergeProjects();
  const deleteProjectMut = useDeleteProject();

  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [dropTargetProjectId, setDropTargetProjectId] = useState<number | null>(null);
  const [dragEpicId, setDragEpicId] = useState<number | null>(null);

  // Multi-select (always available)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mergeModal, setMergeModal] = useState(false);
  const [mergeName, setMergeName] = useState("");

  // New project modal
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Rename modal
  const [renameModal, setRenameModal] = useState<{ id: number; name: string } | null>(null);

  // Project search + sort
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSort, setProjectSort] = useState<"end_date" | "name" | "progress" | "points">("end_date");

  // Epic list search + sort
  const [epicSearch, setEpicSearch] = useState("");
  const [epicSort, setEpicSort] = useState<"key" | "name" | "stories" | "points">("key");

  // Backlog is the "unassigned" bucket — its epics show in the bottom list
  const backlogProject = projects?.find((p) => p.name === "Backlog");
  const unassignedEpicsRaw =
    allEpics?.filter((e) => backlogProject && e.project_id === backlogProject.id) ?? [];

  const unassignedEpics = unassignedEpicsRaw
    .filter((e) => {
      if (!epicSearch) return true;
      const q = epicSearch.toLowerCase();
      return (
        e.epic_key.toLowerCase().includes(q) ||
        (e.summary ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (epicSort) {
        case "name":
          return (a.summary ?? "").localeCompare(b.summary ?? "");
        case "stories":
          return b.ticket_count - a.ticket_count;
        case "points":
          return b.total_points - a.total_points;
        case "key":
        default:
          return a.epic_key.localeCompare(b.epic_key);
      }
    });

  // Project cards: active projects except Backlog
  const activeProjectsRaw =
    projects?.filter((p) => !INACTIVE_STATUSES.includes(p.status) && p.name !== "Backlog") ?? [];
  const activeProjects = activeProjectsRaw
    .filter((p) => {
      if (!projectSearch) return true;
      const q = projectSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.dependencies.some((d) => d.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      switch (projectSort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "progress": {
          const pctA = a.total_points > 0 ? a.completed_points / a.total_points : 0;
          const pctB = b.total_points > 0 ? b.completed_points / b.total_points : 0;
          return pctB - pctA;
        }
        case "points":
          return b.total_points - a.total_points;
        case "end_date":
        default: {
          if (a.forecast_end_date && b.forecast_end_date) return a.forecast_end_date.localeCompare(b.forecast_end_date);
          if (a.forecast_end_date) return -1;
          if (b.forecast_end_date) return 1;
          return a.name.localeCompare(b.name);
        }
      }
    });
  const inactiveProjects =
    projects?.filter((p) => INACTIVE_STATUSES.includes(p.status)) ?? [];

  // --- Drag handlers for epics ---
  const handleEpicDragStart = (e: DragEvent, epicId: number) => {
    setDragEpicId(epicId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleProjectDragOver = (e: DragEvent, projectId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragEpicId !== null) {
      setDropTargetProjectId(projectId);
    }
  };

  const handleProjectDragLeave = () => {
    setDropTargetProjectId(null);
  };

  const handleProjectDrop = (e: DragEvent, projectId: number) => {
    e.preventDefault();
    setDropTargetProjectId(null);
    if (dragEpicId === null) return;

    const epic = allEpics?.find((ep) => ep.id === dragEpicId);
    if (!epic || epic.project_id === projectId) {
      setDragEpicId(null);
      return;
    }

    moveEpic.mutate({ id: dragEpicId, project_id: projectId });
    setDragEpicId(null);
  };

  const handleToggleActive = (id: number, status: string) => {
    updateProject.mutate({ id, data: { status } });
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { name: newProjectName.trim() },
      {
        onSuccess: () => {
          setNewProjectName("");
          setNewProjectModal(false);
        },
      }
    );
  };

  const handleCreateProjectAndMove = (epicId: number, projectName: string) => {
    createProject.mutate(
      { name: projectName },
      {
        onSuccess: (newProject) => {
          moveEpic.mutate({ id: epicId, project_id: newProject.id });
        },
      }
    );
  };

  const handleRename = () => {
    if (!renameModal || !renameModal.name.trim()) return;
    updateProject.mutate(
      { id: renameModal.id, data: { name: renameModal.name.trim() } },
      { onSuccess: () => setRenameModal(null) }
    );
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCombine = () => {
    if (selectedIds.size < 2 || !mergeName.trim()) return;
    const ids = Array.from(selectedIds);
    const targetId = ids[0];
    const sourceIds = ids.slice(1);

    let chain = Promise.resolve();
    for (const sourceId of sourceIds) {
      chain = chain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            mergeProjects.mutate(
              { source_id: sourceId, target_id: targetId, name: mergeName.trim() },
              { onSuccess: () => resolve(), onError: (e) => reject(e) }
            );
          })
      );
    }
    chain.then(() => {
      setMergeModal(false);
      setMergeName("");
      setSelectedIds(new Set());
    });
  };

  const handleMultiDelete = () => {
    const names = Array.from(selectedIds)
      .map((id) => projects?.find((p) => p.id === id)?.name)
      .filter(Boolean);
    if (!window.confirm(`Delete ${names.length} project(s)?\n\n${names.join("\n")}\n\nThis cannot be undone.`)) return;

    let chain = Promise.resolve();
    for (const id of selectedIds) {
      chain = chain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            deleteProjectMut.mutate(id, { onSuccess: () => resolve(), onError: (e) => reject(e) });
          })
      );
    }
    chain.then(() => setSelectedIds(new Set()));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const isLoading = projectsLoading || epicsLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
        <button
          onClick={() => setNewProjectModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {isLoading && (
        <div className="text-sm text-slate-400">Loading...</div>
      )}

      {/* === Project Search + Sort === */}
      {activeProjectsRaw.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <ArrowUpDown size={14} className="text-slate-400" />
            {(["end_date", "name", "progress", "points"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setProjectSort(s)}
                className={`px-2 py-1 text-xs rounded ${
                  projectSort === s
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s === "end_date" ? "End Date" : s === "name" ? "Name" : s === "progress" ? "Progress" : "Points"}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-400">
            {activeProjects.length}{projectSearch ? ` of ${activeProjectsRaw.length}` : ""}
          </span>
        </div>
      )}

      {/* === Project Cards === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {activeProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isDropTarget={dropTargetProjectId === project.id}
            onDragOver={(e) => handleProjectDragOver(e, project.id)}
            onDragLeave={handleProjectDragLeave}
            onDrop={(e) => handleProjectDrop(e, project.id)}
            onToggleActive={handleToggleActive}
            onRename={(id, name) => setRenameModal({ id, name })}
            selected={selectedIds.has(project.id)}
            onToggleSelect={() => toggleSelect(project.id)}
          />
        ))}
      </div>

      {activeProjects.length === 0 && !isLoading && (
        <div className="text-center py-8 text-slate-400 text-sm mb-8">
          No projects yet. Drag epics from below into a project, or create one.
        </div>
      )}

      {/* === Unassigned Epics === */}
      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <ListMusic size={18} className="text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-700">
            Backlog
          </h2>
          <span className="text-sm text-slate-400">
            ({unassignedEpics.length}{epicSearch ? ` of ${unassignedEpicsRaw.length}` : ""})
          </span>
        </div>

        {/* Search + Sort controls */}
        {unassignedEpicsRaw.length > 0 && (
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search epics..."
                value={epicSearch}
                onChange={(e) => setEpicSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpDown size={14} className="text-slate-400" />
              {(["key", "name", "stories", "points"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEpicSort(s)}
                  className={`px-2 py-1 text-xs rounded ${
                    epicSort === s
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {s === "key" ? "Key" : s === "name" ? "Name" : s === "stories" ? "Stories" : "Points"}
                </button>
              ))}
            </div>
          </div>
        )}

        {unassignedEpicsRaw.length === 0 && !isLoading && (
          <div className="text-sm text-slate-400 py-4">
            All epics have been assigned to projects.
          </div>
        )}

        {epicSearch && unassignedEpics.length === 0 && unassignedEpicsRaw.length > 0 && (
          <div className="text-sm text-slate-400 py-4">
            No epics match &quot;{epicSearch}&quot;
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {unassignedEpics.map((epic) => (
              <EpicRow
                key={epic.id}
                epic={epic}
                projects={activeProjects}
                onDragStart={handleEpicDragStart}
                onMoveToProject={(epicId, projectId) =>
                  moveEpic.mutate({ id: epicId, project_id: projectId })
                }
                onCreateProjectAndMove={handleCreateProjectAndMove}
              />
          ))}
        </div>
      </div>

      {/* === Inactive Projects === */}
      {inactiveProjects.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <button
            onClick={() => setInactiveOpen(!inactiveOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-4"
          >
            {inactiveOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Inactive ({inactiveProjects.length})
          </button>
          {inactiveOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {inactiveProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isDropTarget={dropTargetProjectId === project.id}
                  onDragOver={(e) => handleProjectDragOver(e, project.id)}
                  onDragLeave={handleProjectDragLeave}
                  onDrop={(e) => handleProjectDrop(e, project.id)}
                  onToggleActive={handleToggleActive}
                  onRename={(id, name) => setRenameModal({ id, name })}
                  selected={selectedIds.has(project.id)}
                  onToggleSelect={() => toggleSelect(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* === New Project Modal === */}
      {newProjectModal && (
        <Modal onClose={() => setNewProjectModal(false)}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">New Project</h2>
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateProject();
              if (e.key === "Escape") setNewProjectModal(false);
            }}
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setNewProjectModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createProject.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {/* === Rename Modal === */}
      {renameModal && (
        <Modal onClose={() => setRenameModal(null)}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Rename Project</h2>
          <input
            type="text"
            value={renameModal.name}
            onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setRenameModal(null);
            }}
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRenameModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button
              onClick={handleRename}
              disabled={!renameModal.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* === Combine Modal === */}
      {mergeModal && (
        <Modal onClose={() => setMergeModal(false)}>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Combine Projects</h2>
          <p className="text-sm text-slate-500 mb-4">
            Merging {selectedIds.size} projects. All epics will be moved into a single project.
          </p>
          <div className="space-y-1 mb-4">
            {Array.from(selectedIds).map((id) => {
              const p = projects?.find((proj) => proj.id === id);
              return p ? (
                <div key={id} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded px-3 py-1.5">
                  <FolderOpen size={14} className="text-blue-400" />
                  {p.name}
                  <span className="text-xs text-slate-400 ml-auto">{p.epic_count} epics</span>
                </div>
              ) : null;
            })}
          </div>
          <label className="text-sm text-slate-600 font-medium">Combined project name</label>
          <input
            type="text"
            placeholder="New project name"
            value={mergeName}
            onChange={(e) => setMergeName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 mb-4"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCombine();
              if (e.key === "Escape") setMergeModal(false);
            }}
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setMergeModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button
              onClick={handleCombine}
              disabled={!mergeName.trim() || mergeProjects.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Combine
            </button>
          </div>
        </Modal>
      )}

      {/* === Floating action bar (appears when projects selected) === */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-xl shadow-xl px-5 py-3 flex items-center gap-3 z-50">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-slate-600" />
          {selectedIds.size >= 2 && (
            <button
              onClick={() => {
                const firstName = projects?.find((p) => selectedIds.has(p.id))?.name ?? "";
                setMergeName(firstName);
                setMergeModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
            >
              <Merge size={14} />
              Combine
            </button>
          )}
          <button
            onClick={handleMultiDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors ml-1"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Components ───

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleActive,
  onRename,
  selected,
  onToggleSelect,
}: {
  project: Project;
  isDropTarget: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onToggleActive: (id: number, status: string) => void;
  onRename: (id: number, name: string) => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const pct = project.total_points > 0
    ? Math.round((project.completed_points / project.total_points) * 100)
    : 0;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`bg-white border rounded-xl p-5 transition-all relative group h-52 flex flex-col ${
        isDropTarget
          ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50/50"
          : selected
            ? "border-blue-400 ring-2 ring-blue-200"
            : "border-slate-200 hover:shadow-md"
      }`}
    >
      {/* Checkbox — always visible top-right, next to toggle */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? "bg-blue-500 border-blue-500 text-white"
              : "border-slate-200 bg-white opacity-0 group-hover:opacity-100 hover:border-slate-400"
          }`}
        >
          {selected && <Check size={12} />}
        </button>
        <button
          onClick={() =>
            onToggleActive(project.id, INACTIVE_STATUSES.includes(project.status) ? "Pending" : "Complete")
          }
          title={INACTIVE_STATUSES.includes(project.status) ? "Set Active" : "Mark Complete"}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        >
          {INACTIVE_STATUSES.includes(project.status) ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      <Link to={`/projects/${project.id}`} className="flex flex-col flex-1 min-h-0">
        {/* Project name + status */}
        <div className="flex items-center gap-2 mb-1.5">
          <FolderOpen size={16} className="text-blue-500 shrink-0" />
          <h2 className="font-semibold text-slate-800 truncate text-sm">{project.name}</h2>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${STATUS_COLORS[project.status] ?? "bg-slate-100 text-slate-500"}`}>
            {project.status}
          </span>
        </div>

        {/* Stats line */}
        <div className="text-xs text-slate-500 mb-3">
          {project.epic_count} {project.epic_count === 1 ? "epic" : "epics"} · {project.ticket_count} {project.ticket_count === 1 ? "story" : "stories"} · {project.total_points} pts
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
            <span>{project.completed_points} / {project.total_points} pts</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Forecast end date */}
        <div className="flex items-center gap-3 text-xs mb-1.5">
          {project.forecast_end_date ? (
            <span className="flex items-center gap-1 text-slate-600">
              <Calendar size={11} className="text-slate-400" />
              Est. {new Date(project.forecast_end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {project.forecast_weeks != null && (
                <span className="text-slate-400 ml-0.5">· ~{project.forecast_weeks} wks</span>
              )}
            </span>
          ) : project.target_date ? (
            <span className="text-slate-400">Target: {project.target_date}</span>
          ) : (
            <span className="text-slate-300 italic">No forecast</span>
          )}
        </div>

        {/* Quarters + Dependency labels */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto">
          {project.quarters.length > 0 && (
            <>
              {project.quarters.map((q) => (
                <span key={q} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                  {q}
                </span>
              ))}
            </>
          )}
          {project.dependencies.length > 0 && (
            <>
              <Link2 size={11} className="text-orange-400 shrink-0" />
              {project.dependencies.map((dep, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  {dep}
                </span>
              ))}
            </>
          )}
        </div>
      </Link>

      {/* Rename button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onRename(project.id, project.name);
        }}
        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 hover:text-slate-600 z-10"
      >
        Rename
      </button>

      {/* Drop zone indicator */}
      {isDropTarget && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-blue-400 flex items-center justify-center bg-blue-50/80 pointer-events-none">
          <span className="text-sm font-medium text-blue-600">Drop epic here</span>
        </div>
      )}
    </div>
  );
}

function EpicRow({
  epic,
  projects,
  onDragStart,
  onMoveToProject,
  onCreateProjectAndMove,
}: {
  epic: Epic;
  projects: Project[];
  onDragStart: (e: DragEvent, id: number) => void;
  onMoveToProject: (epicId: number, projectId: number) => void;
  onCreateProjectAndMove: (epicId: number, projectName: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateProjectAndMove(epic.id, newName.trim());
    setNewName("");
    setShowNewInput(false);
    setShowDropdown(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, epic.id)}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/60 group cursor-grab active:cursor-grabbing transition-colors"
    >
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <span className="font-mono text-xs text-slate-400 shrink-0 w-24">{epic.epic_key}</span>
      <span className="text-sm text-slate-700 truncate flex-1">{epic.summary}</span>
      <span className="text-xs text-slate-400 shrink-0">{epic.ticket_count} stories</span>
      <span className="text-xs text-emerald-500 shrink-0 w-14 text-right">{epic.total_points} pts</span>

      {/* Add to project button */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setShowDropdown(!showDropdown); setShowNewInput(false); setNewName(""); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus size={12} />
          Add to project
        </button>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowDropdown(false); setShowNewInput(false); }} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 w-64 max-h-72 overflow-y-auto">
              {/* New project option */}
              {!showNewInput ? (
                <button
                  onClick={() => setShowNewInput(true)}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100"
                >
                  <Plus size={14} className="shrink-0" />
                  New project...
                </button>
              ) : (
                <div className="px-3 py-2 border-b border-slate-100">
                  <input
                    type="text"
                    placeholder="Project name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }
                    }}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1.5"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create & Add
                  </button>
                </div>
              )}
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onMoveToProject(epic.id, p.id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <FolderOpen size={14} className="text-blue-400 shrink-0" />
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-slate-400 ml-auto shrink-0">{p.epic_count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
