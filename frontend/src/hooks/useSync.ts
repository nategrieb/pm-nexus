import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncProject } from "../api/sync";

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
