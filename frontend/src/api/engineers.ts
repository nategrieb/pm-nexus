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

export const updateEngineer = (
  id: number,
  data: { location?: string; weekly_hours?: number; manual_tags?: string[] }
) => api.put<Engineer>(`/engineers/${id}`, data).then((r) => r.data);
