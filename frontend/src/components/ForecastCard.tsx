import { useQuery } from "@tanstack/react-query";
import { getForecast } from "../api/forecast";
import { CalendarClock } from "lucide-react";

interface Props {
  projectId: number;
}

export default function ForecastCard({ projectId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["forecast", projectId],
    queryFn: () => getForecast(projectId),
  });

  if (isLoading) return <div className="text-sm text-slate-400">Loading forecast...</div>;
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        <CalendarClock size={18} />
        Timeline Forecast
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-slate-400">Remaining Points</div>
          <div className="text-lg font-semibold">{data.remaining_points}</div>
        </div>
        <div>
          <div className="text-slate-400">Weekly Velocity</div>
          <div className="text-lg font-semibold">
            {data.weekly_velocity ?? "N/A"}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Weeks to Completion</div>
          <div className="text-lg font-semibold">
            {data.weeks_to_completion ?? "N/A"}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Estimated End</div>
          <div className="text-lg font-semibold">
            {data.calculated_end_date ?? "N/A"}
          </div>
        </div>
      </div>
      {data.unpointed_count > 0 && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          {data.unpointed_count} unpointed ticket(s) buffered at{" "}
          {data.buffer_per_ticket} pts each
        </div>
      )}
    </div>
  );
}
