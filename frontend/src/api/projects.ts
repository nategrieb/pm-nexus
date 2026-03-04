import { api } from "./client";
import type { Project, ProjectDetail } from "../types";

export const getProjects = () =>
  api.get<Project[]>("/projects").then((r) => r.data);

export const getProject = (id: number) =>
  api.get<ProjectDetail>(`/projects/${id}`).then((r) => r.data);

export const createProject = (data: {
  name: string;
  status?: string;
  target_date?: string | null;
}) => api.post<Project>("/projects", data).then((r) => r.data);

export const updateProject = (
  id: number,
  data: { name?: string; status?: string; target_date?: string | null }
) => api.put<Project>(`/projects/${id}`, data).then((r) => r.data);

export const deleteProject = (id: number) =>
  api.delete(`/projects/${id}`).then((r) => r.data);
