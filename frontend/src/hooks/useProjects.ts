import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as projectsApi from "../api/projects";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: projectsApi.getProjects });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.getProject(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof projectsApi.updateProject>[1] }) =>
      projectsApi.updateProject(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useMergeProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.mergeProjects,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
