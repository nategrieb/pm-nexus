import { RefreshCw } from "lucide-react";
import { useSyncProject } from "../hooks/useSync";
import type { SyncResult } from "../types";
import { useState } from "react";

interface Props {
  projectId: number;
}

export default function SyncButton({ projectId }: Props) {
  const sync = useSyncProject();
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setResult(null);
    const res = await sync.mutateAsync(projectId);
    setResult(res);
    setTimeout(() => setResult(null), 5000);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={sync.isPending}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={16} className={sync.isPending ? "animate-spin" : ""} />
        {sync.isPending ? "Syncing..." : "Sync with Jira"}
      </button>
      {result && (
        <span className="text-sm text-slate-600">
          {result.tickets_created} created, {result.tickets_updated} updated
          {result.errors.length > 0 && (
            <span className="text-red-500 ml-2">
              ({result.errors.length} errors)
            </span>
          )}
        </span>
      )}
      {sync.isError && (
        <span className="text-sm text-red-500">Sync failed. Check settings.</span>
      )}
    </div>
  );
}
