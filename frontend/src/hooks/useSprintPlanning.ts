import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as sprintApi from "../api/sprintPlanning";

export function useBoards() {
  return useQuery({
    queryKey: ["sprint-planning", "boards"],
    queryFn: sprintApi.getBoards,
  });
}

export function useSprints(boardId: number | null) {
  return useQuery({
    queryKey: ["sprint-planning", "sprints", boardId],
    queryFn: () => sprintApi.getSprints(boardId!),
    enabled: !!boardId,
  });
}

export function useSprintPlan(sprintId: number | null) {
  return useQuery({
    queryKey: ["sprint-planning", "plan", sprintId],
    queryFn: () => sprintApi.getSprintPlan(sprintId!),
    enabled: !!sprintId,
  });
}

export function useUpdateRollover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sprintId,
      engineerId,
      rolloverPoints,
    }: {
      sprintId: number;
      engineerId: number;
      rolloverPoints: number;
    }) =>
      sprintApi.updateRollover(sprintId, {
        engineer_id: engineerId,
        rollover_points: rolloverPoints,
      }),
    onSuccess: (_, { sprintId }) => {
      qc.invalidateQueries({
        queryKey: ["sprint-planning", "plan", sprintId],
      });
    },
  });
}
