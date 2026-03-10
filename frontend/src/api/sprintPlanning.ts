import { api } from "./client";
import type {
  JiraBoard,
  JiraSprint,
  SprintPlanningResponse,
} from "../types";

export const getBoards = () =>
  api.get<JiraBoard[]>("/sprint-planning/boards").then((r) => r.data);

export const getSprints = (boardId: number) =>
  api
    .get<JiraSprint[]>("/sprint-planning/sprints", {
      params: { board_id: boardId },
    })
    .then((r) => r.data);

export const getSprintPlan = (sprintId: number) =>
  api
    .get<SprintPlanningResponse>(`/sprint-planning/plan/${sprintId}`)
    .then((r) => r.data);

export const updateRollover = (
  sprintId: number,
  data: { engineer_id: number; rollover_points: number }
) => api.put(`/sprint-planning/rollover/${sprintId}`, data).then((r) => r.data);
