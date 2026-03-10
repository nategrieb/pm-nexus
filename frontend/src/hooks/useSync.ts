import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncProject, syncAll } from "../api/sync";

export function useSyncProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncProject,
    onSuccess: (_, projectId) => {
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["engineers"] });
      qc.invalidateQueries({ queryKey: ["forecast", projectId] });
      qc.invalidateQueries({ queryKey: ["gap-analysis", projectId] });
    },
  });
}

export function useSyncAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["engineers"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["gap-analysis"] });
    },
  });
}
