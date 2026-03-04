import { api } from "./client";
import type { SyncResult } from "../types";

export const syncProject = (projectId: number) =>
  api.post<SyncResult>(`/sync/project/${projectId}`).then((r) => r.data);
