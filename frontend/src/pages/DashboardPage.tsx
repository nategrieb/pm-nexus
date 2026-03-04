import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects, useCreateProject } from "../hooks/useProjects";
import ProgressBar from "../components/ProgressBar";
import { Plus, FolderOpen } from "lucide-react";

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject.mutateAsync({
      name: newName.trim(),
      target_date: newDate || null,
    });
    setNewName("");
    setNewDate("");
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={createProject.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-slate-400">Loading projects...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-blue-500" />
                <h2 className="font-semibold text-slate-800">{project.name}</h2>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  project.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {project.status}
              </span>
            </div>
            {project.target_date && (
              <p className="text-xs text-slate-400 mb-3">
                Target: {project.target_date}
              </p>
            )}
            <ProgressBar completed={0} total={0} />
          </Link>
        ))}
      </div>

      {projects?.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
          <p>No projects yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
