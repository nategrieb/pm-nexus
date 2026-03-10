import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as epicsApi from "../api/epics";

export function useEpics() {
  return useQuery({ queryKey: ["epics"], queryFn: () => epicsApi.getEpics() });
}

export function useMoveEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, project_id }: { id: number; project_id: number }) =>
      epicsApi.moveEpic(id, project_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epics"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
