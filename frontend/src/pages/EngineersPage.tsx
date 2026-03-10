import { useState } from "react";
import type { DragEvent } from "react";
import { Link } from "react-router-dom";
import { useEngineers, useUpdateEngineer, useCurrentTickets, useSprintPoints, useBlockedTickets } from "../hooks/useEngineers";
import { useProjects } from "../hooks/useProjects";
import { Users, ChevronDown, ChevronRight, UserX, UserCheck, Palmtree, ShieldAlert, Clock, FlaskConical } from "lucide-react";
import type { Engineer, Project } from "../types";
import { currentTimeIn } from "../utils/timezones";

function EngineerCard({
  eng,
  onToggleActive,
  currentTicket,
  sprintPoints,
  blockedCount,
  projectName,
  onDragStart,
}: {
  eng: Engineer;
  onToggleActive: (id: number, active: boolean) => void;
  currentTicket?: { jira_key: string; title: string; type: "in_progress" | "up_next" };
  sprintPoints: number;
  blockedCount: number;
  projectName?: string;
  onDragStart: (e: DragEvent, id: number) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isOoo =
    eng.ooo_start && eng.ooo_end && eng.ooo_start <= today && today <= eng.ooo_end;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, eng.id)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow relative group cursor-grab active:cursor-grabbing"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleActive(eng.id, !eng.is_active);
        }}
        title={eng.is_active ? "Move to Inactive" : "Move to Active"}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
      >
        {eng.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
      </button>
      <Link to={`/engineers/${eng.id}`} className="block">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold">
            {eng.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800 truncate">{eng.name}</h2>
              {blockedCount > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 shrink-0">
                  <ShieldAlert size={10} /> {blockedCount} blocked
                </span>
              )}
              {isOoo && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 shrink-0">
                  <Palmtree size={10} /> OOO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {projectName && <span className="text-slate-500">{projectName}</span>}
              {eng.timezone && (
                <span className="flex items-center gap-0.5">
                  <Clock size={10} />
                  {currentTimeIn(eng.timezone)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs mb-2">
          <span className={sprintPoints > eng.sprint_capacity ? "text-red-600 font-medium" : "text-slate-500"}>
            {sprintPoints}
          </span>
          <span className="text-slate-400"> / {eng.sprint_capacity} pts this sprint</span>
        </div>

        {currentTicket && (
          <div className={`mb-2 flex items-center gap-1.5 text-xs rounded px-2 py-1.5 ${
            currentTicket.type === "in_progress" ? "bg-blue-50" : "bg-slate-50 border border-dashed border-slate-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              currentTicket.type === "in_progress" ? "bg-blue-500" : "bg-slate-300"
            }`} />
            <a
              href={`https://collectors.atlassian.net/browse/${currentTicket.jira_key}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono hover:underline shrink-0 ${
                currentTicket.type === "in_progress" ? "text-blue-600" : "text-slate-400"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {currentTicket.jira_key}
            </a>
            <span className={`truncate ${
              currentTicket.type === "in_progress" ? "text-slate-600" : "text-slate-400"
            }`}>{currentTicket.title}</span>
            {currentTicket.type === "up_next" && (
              <span className="text-[10px] text-slate-400 shrink-0 ml-auto">up next</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {eng.auto_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600"
            >
              {tag}
            </span>
          ))}
          {eng.manual_tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </div>
  );
}

type DropZone = "engineer" | "qa" | "inactive";

function DropSection({
  zone,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  zone: DropZone;
  isDragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, zone: DropZone) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, zone)}
      className={`rounded-xl transition-colors ${isDragOver ? "bg-blue-50 ring-2 ring-blue-200 ring-inset" : ""}`}
    >
      {children}
    </div>
  );
}

export default function EngineersPage() {
  const { data: engineers, isLoading } = useEngineers();
  const { data: currentTicketMap = {} } = useCurrentTickets();
  const { data: sprintPointsMap = {} } = useSprintPoints();
  const { data: blockedMap = {} } = useBlockedTickets();
  const { data: projects = [] } = useProjects();
  const updateEngineer = useUpdateEngineer();
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [dragOverZone, setDragOverZone] = useState<DropZone | null>(null);
  const [dragEngineerId, setDragEngineerId] = useState<number | null>(null);

  const projectMap = new Map<number, Project>(projects.map((p) => [p.id, p]));

  const activeEngineers = engineers?.filter((e) => e.is_active && e.role !== "qa") ?? [];
  const qaEngineers = engineers?.filter((e) => e.is_active && e.role === "qa") ?? [];
  const inactiveEngineers = engineers?.filter((e) => !e.is_active) ?? [];

  const handleToggleActive = (id: number, active: boolean) => {
    updateEngineer.mutate({ id, data: { is_active: active } });
  };

  const handleDragStart = (e: DragEvent, id: number) => {
    setDragEngineerId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, zone: DropZone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverZone(zone);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (_e: DragEvent, zone: DropZone) => {
    setDragOverZone(null);
    if (dragEngineerId === null) return;

    const eng = engineers?.find((e) => e.id === dragEngineerId);
    if (!eng) return;

    // Determine what updates are needed
    if (zone === "engineer" && (eng.role === "qa" || !eng.is_active)) {
      updateEngineer.mutate({ id: dragEngineerId, data: { role: "engineer", is_active: true } });
    } else if (zone === "qa" && (eng.role !== "qa" || !eng.is_active)) {
      updateEngineer.mutate({ id: dragEngineerId, data: { role: "qa", is_active: true } });
    } else if (zone === "inactive" && eng.is_active) {
      updateEngineer.mutate({ id: dragEngineerId, data: { is_active: false } });
    }

    setDragEngineerId(null);
  };

  const renderGrid = (list: Engineer[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((eng) => (
        <EngineerCard
          key={eng.id}
          eng={eng}
          onToggleActive={handleToggleActive}
          currentTicket={currentTicketMap[eng.id]}
          sprintPoints={sprintPointsMap[eng.id] ?? 0}
          blockedCount={blockedMap[eng.id] ?? 0}
          projectName={eng.current_project_id ? projectMap.get(eng.current_project_id)?.name : undefined}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Engineers</h1>

      {isLoading && (
        <div className="text-sm text-slate-400">Loading...</div>
      )}

      {/* Active Engineers */}
      <DropSection
        zone="engineer"
        isDragOver={dragOverZone === "engineer"}
        onDragOver={(e) => handleDragOver(e, "engineer")}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {renderGrid(activeEngineers)}
      </DropSection>

      {activeEngineers.length === 0 && !isLoading && inactiveEngineers.length === 0 && qaEngineers.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p>No engineers yet. They will appear after syncing a project.</p>
        </div>
      )}

      {/* QA Team */}
      <div className="mt-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-4">
          <FlaskConical size={16} />
          QA Team ({qaEngineers.length})
        </div>
        <DropSection
          zone="qa"
          isDragOver={dragOverZone === "qa"}
          onDragOver={(e) => handleDragOver(e, "qa")}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {qaEngineers.length > 0 ? (
            renderGrid(qaEngineers)
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center text-sm text-slate-400">
              Drag engineers here to add them to the QA team
            </div>
          )}
        </DropSection>
      </div>

      {/* Inactive Engineers */}
      {inactiveEngineers.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setInactiveOpen(!inactiveOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-4"
          >
            {inactiveOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Inactive ({inactiveEngineers.length})
          </button>
          {inactiveOpen && (
            <DropSection
              zone="inactive"
              isDragOver={dragOverZone === "inactive"}
              onDragOver={(e) => handleDragOver(e, "inactive")}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactiveEngineers.map((eng) => (
                  <EngineerCard
                    key={eng.id}
                    eng={eng}
                    onToggleActive={handleToggleActive}
                    currentTicket={currentTicketMap[eng.id]}
                    sprintPoints={sprintPointsMap[eng.id] ?? 0}
                    blockedCount={blockedMap[eng.id] ?? 0}
                    projectName={eng.current_project_id ? projectMap.get(eng.current_project_id)?.name : undefined}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </DropSection>
          )}
        </div>
      )}
    </div>
  );
}
