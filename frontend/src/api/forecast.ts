import { api } from "./client";
import type { ForecastResult } from "../types";

export const getForecast = (projectId: number) =>
  api.get<ForecastResult>(`/forecast/${projectId}`).then((r) => r.data);
