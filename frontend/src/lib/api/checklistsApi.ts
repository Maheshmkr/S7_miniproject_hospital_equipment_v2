import { del, get, post, put } from "./client";
import type { ApiChecklistQuestion, ApiChecklistTemplate } from "./types";

export const checklistsApi = {
  templates: (params?: { category?: string; equipmentId?: string; active?: boolean }) =>
    get<ApiChecklistTemplate[]>("/checklists/templates", params),
  template: (id: string) =>
    get<{ template: ApiChecklistTemplate; questions: ApiChecklistQuestion[] }>(
      `/checklists/templates/${id}`,
    ),
  createTemplate: (payload: Partial<ApiChecklistTemplate>) =>
    post<ApiChecklistTemplate>("/checklists/templates", payload),
  updateTemplate: (id: string, payload: Partial<ApiChecklistTemplate>) =>
    put<ApiChecklistTemplate>(`/checklists/templates/${id}`, payload),
  deleteTemplate: (id: string) => del<null>(`/checklists/templates/${id}`),
  addQuestion: (templateId: string, payload: Partial<ApiChecklistQuestion>) =>
    post<ApiChecklistQuestion>(`/checklists/templates/${templateId}/questions`, payload),
  updateQuestion: (id: string, payload: Partial<ApiChecklistQuestion>) =>
    put<ApiChecklistQuestion>(`/checklists/questions/${id}`, payload),
  deleteQuestion: (id: string) => del<null>(`/checklists/questions/${id}`),
};
