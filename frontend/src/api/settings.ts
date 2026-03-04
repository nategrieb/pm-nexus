import { api } from "./client";
import type { Setting, SettingsUpdate, ConnectionTestResult } from "../types";

export const getSettings = () =>
  api.get<Setting[]>("/settings").then((r) => r.data);

export const updateSettings = (data: SettingsUpdate) =>
  api.put("/settings", data).then((r) => r.data);

export const testConnection = () =>
  api.post<ConnectionTestResult>("/settings/test-connection").then((r) => r.data);
