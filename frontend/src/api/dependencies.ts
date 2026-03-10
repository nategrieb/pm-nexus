import { api } from "./client";
import type { Dependency } from "../types";

export const createDependency = (data: { project_id: number; team_name: string }) =>
  api.post<Dependency>("/dependencies", data).then((r) => r.data);

export const deleteDependency = (id: number) =>
  api.delete(`/dependencies/${id}`).then((r) => r.data);
