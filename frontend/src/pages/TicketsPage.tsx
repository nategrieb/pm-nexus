import { useQuery } from "@tanstack/react-query";
import { getTickets } from "../api/tickets";
import TicketTable from "../components/TicketTable";

export default function TicketsPage() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => getTickets(),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">All Tickets</h1>

      {isLoading ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <TicketTable tickets={tickets} />
        </div>
      )}
    </div>
  );
}
