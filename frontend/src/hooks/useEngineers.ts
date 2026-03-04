import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as engineersApi from "../api/engineers";

export function useEngineers() {
  return useQuery({
    queryKey: ["engineers"],
    queryFn: engineersApi.getEngineers,
  });
}

export function useEngineer(id: number) {
  return useQuery({
    queryKey: ["engineers", id],
    queryFn: () => engineersApi.getEngineer(id),
  });
}

export function useKanban(id: number) {
  return useQuery({
    queryKey: ["engineers", id, "kanban"],
    queryFn: () => engineersApi.getKanban(id),
  });
}

export function useUpdateEngineer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof engineersApi.updateEngineer>[1];
    }) => engineersApi.updateEngineer(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["engineers", id] });
      qc.invalidateQueries({ queryKey: ["engineers"] });
    },
  });
}
