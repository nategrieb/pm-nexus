import { api } from "./client";
import type { Engineer, EngineerDetail } from "../types";

export const getEngineers = () =>
  api.get<Engineer[]>("/engineers").then((r) => r.data);

export const getEngineer = (id: number) =>
  api.get<EngineerDetail>(`/engineers/${id}`).then((r) => r.data);

export const getKanban = (id: number) =>
  api
    .get<Record<string, { jira_key: string; title: string; points: number | null }[]>>(
      `/engineers/${id}/kanban`
    )
    .then((r) => r.data);

export const getCurrentTickets = () =>
  api
    .get<Record<string, { jira_key: string; title: string; type: "in_progress" | "up_next" }>>(
      "/engineers/current-tickets"
    )
    .then((r) => r.data);

export const getSprintPoints = () =>
  api
    .get<Record<string, number>>("/engineers/sprint-points")
    .then((r) => r.data);

export const getBlockedTickets = () =>
  api
    .get<Record<string, number>>("/engineers/blocked-tickets")
    .then((r) => r.data);

export const updateEngineer = (
  id: number,
  data: {
    location?: string;
    weekly_hours?: number;
    manual_tags?: string[];
    is_active?: boolean;
    timezone?: string;
    ooo_start?: string;
    ooo_end?: string;
    sprint_capacity?: number;
    current_project_id?: number;
    role?: string;
  }
) => api.put<Engineer>(`/engineers/${id}`, data).then((r) => r.data);
