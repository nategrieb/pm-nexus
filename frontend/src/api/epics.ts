import { api } from "./client";
import type { Epic } from "../types";

export const getEpics = (projectId?: number) =>
  api
    .get<Epic[]>("/epics", { params: projectId ? { project_id: projectId } : {} })
    .then((r) => r.data);

export const createEpic = (data: {
  epic_key: string;
  project_id: number;
  summary?: string;
}) => api.post<Epic>("/epics", data).then((r) => r.data);

export const deleteEpic = (id: number) =>
  api.delete(`/epics/${id}`).then((r) => r.data);
