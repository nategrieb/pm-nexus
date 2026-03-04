import { api } from "./client";
import type { Document } from "../types";

export const getDocuments = (projectId?: number) =>
  api
    .get<Document[]>("/documents", {
      params: projectId ? { project_id: projectId } : {},
    })
    .then((r) => r.data);

export const createDocument = (data: {
  project_id: number;
  doc_type: string;
  url: string;
}) => api.post<Document>("/documents", data).then((r) => r.data);

export const deleteDocument = (id: number) =>
  api.delete(`/documents/${id}`).then((r) => r.data);
