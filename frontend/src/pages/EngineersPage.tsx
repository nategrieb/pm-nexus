import { Link } from "react-router-dom";
import { useEngineers } from "../hooks/useEngineers";
import { Users } from "lucide-react";

export default function EngineersPage() {
  const { data: engineers, isLoading } = useEngineers();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Engineers</h1>

      {isLoading && (
        <div className="text-sm text-slate-400">Loading...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {engineers?.map((eng) => (
          <Link
            key={eng.id}
            to={`/engineers/${eng.id}`}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold">
                {eng.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">{eng.name}</h2>
                {eng.location && (
                  <p className="text-xs text-slate-400">{eng.location}</p>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-2">
              {eng.weekly_hours}h / week
            </div>
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
        ))}
      </div>

      {engineers?.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p>No engineers yet. They will appear after syncing a project.</p>
        </div>
      )}
    </div>
  );
}
