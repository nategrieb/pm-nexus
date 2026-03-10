import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as depsApi from "../api/dependencies";

export function useCreateDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: depsApi.createDependency,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["projects", variables.project_id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: depsApi.deleteDependency,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
