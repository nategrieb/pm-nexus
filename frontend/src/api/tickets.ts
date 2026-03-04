import { api } from "./client";
import type { Ticket, GapAnalysisItem } from "../types";

export const getTickets = (params?: {
  project_id?: number;
  epic_key?: string;
  assignee_id?: number;
  status?: string;
}) => api.get<Ticket[]>("/tickets", { params }).then((r) => r.data);

export const getGapAnalysis = (projectId: number) =>
  api
    .get<GapAnalysisItem[]>("/tickets/gap-analysis", {
      params: { project_id: projectId },
    })
    .then((r) => r.data);

export const updateTicket = (id: number, data: { prd_link?: string }) =>
  api.put<Ticket>(`/tickets/${id}`, data).then((r) => r.data);
