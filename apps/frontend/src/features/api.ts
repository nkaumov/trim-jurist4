import { apiFetch, ApiClientError } from "@/lib/api-client";

export type AuthMe = {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  lastLoginAt: string | null;
};

export type CaseListItem = {
  id: string;
  title: string;
  counterpartyName: string;
  status: string;
  priority: string;
  contractType: string | null;
  updatedAt: string;
};

export type CaseListResponse = {
  items: CaseListItem[];
  total: number;
  page: number;
  limit: number;
};

export async function login(input: { email: string; password: string }) {
  return apiFetch<AuthMe>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export async function me() {
  return apiFetch<AuthMe>("/auth/me");
}

export async function listCases(params: {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return apiFetch<CaseListResponse>(`/cases?${qs.toString()}`);
}

export type CaseDetails = {
  id: string;
  title: string;
  counterpartyName: string;
  status: string;
  description: string | null;
  priority: string;
  contractType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  disagreementInput:
    | {
        id: string;
        inputType: "document" | "free_text" | "manual_items";
        freeText: string | null;
        items: Array<{
          id: string;
          clauseNumber: string | null;
          clauseTitle: string | null;
          ourVersion: string | null;
          counterpartyVersion: string | null;
          clientRequest: string | null;
          comment: string | null;
          sortOrder: number;
        }>;
      }
    | null;
};

export async function getCase(caseId: string) {
  return apiFetch<CaseDetails>(`/cases/${caseId}`);
}

export async function createCase(input: {
  title: string;
  counterpartyName: string;
  priority: "low" | "medium" | "high";
  contractType?: string | null;
  description?: string | null;
  notes?: string | null;
}) {
  return apiFetch<{ id: string }>("/cases", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCase(caseId: string, input: Partial<Omit<CaseDetails, "id" | "createdAt" | "updatedAt" | "disagreementInput">>) {
  return apiFetch<{ id: string }>(`/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export type CaseFile = {
  id: string;
  fileCategory: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export async function listCaseFiles(caseId: string) {
  return apiFetch<CaseFile[]>(`/cases/${caseId}/files`);
}

export async function uploadCaseFile(caseId: string, input: { file: File; fileCategory: string }) {
  const form = new FormData();
  form.append("file", input.file);
  form.append("fileCategory", input.fileCategory);

  const res = await fetch(`/api/cases/${caseId}/files`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const json = (await res.json()) as any;
  if (!res.ok || !json.ok) {
    const err = json?.error ?? { message: "Upload failed", code: "UPLOAD_FAILED" };
    throw new ApiClientError(err.message, { code: err.code, status: res.status, details: err.details });
  }
  return json.data as { id: string };
}

export async function deleteCaseFile(fileId: string) {
  const res = await fetch(`/api/case-files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    throw new ApiClientError("Delete failed", { status: res.status, code: "DELETE_FAILED" });
  }
}

export async function upsertDisagreementInput(caseId: string, input: { inputType: string; freeText?: string | null }) {
  return apiFetch<{ id: string }>(`/cases/${caseId}/disagreement-input`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createDisagreementItem(disagreementInputId: string, input: any) {
  return apiFetch<{ id: string }>(`/disagreement-inputs/${disagreementInputId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function patchDisagreementItem(itemId: string, input: any) {
  return apiFetch<{ id: string }>(`/disagreement-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteDisagreementItem(itemId: string) {
  const res = await fetch(`/api/disagreement-items/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    throw new ApiClientError("Delete failed", { status: res.status, code: "DELETE_FAILED" });
  }
}

export type KnowledgeDoc = {
  id: string;
  title: string;
  rules: string | null;
  sourceType: string;
  mimeType?: string | null;
  tags: string[];
  updatedAt: string;
  externalUrl?: string | null;
};

export async function listOrgKnowledge() {
  return apiFetch<KnowledgeDoc[]>("/knowledge/organization");
}

export async function listGlobalKnowledge() {
  return apiFetch<KnowledgeDoc[]>("/knowledge/global");
}

export async function uploadOrgKnowledge(input: { file: File; title: string; sourceType: string; rules?: string; tags?: string[] }) {
  const form = new FormData();
  form.append("file", input.file);
  form.append("title", input.title);
  form.append("sourceType", input.sourceType);
  if (input.rules) form.append("rules", input.rules);
  if (input.tags?.length) form.append("tags", input.tags.join(","));

  const res = await fetch(`/api/knowledge/organization/files`, {
    method: "POST",
    body: form,
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as any;
  if (!res.ok || !json.ok) {
    const err = json?.error ?? { message: "Upload failed", code: "UPLOAD_FAILED" };
    throw new ApiClientError(err.message, { code: err.code, status: res.status, details: err.details });
  }
  return json.data as { id: string };
}

export async function deleteOrgKnowledgeDoc(docId: string) {
  const res = await fetch(`/api/knowledge/organization/${docId}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok && res.status !== 204) {
    throw new ApiClientError("Delete failed", { status: res.status, code: "DELETE_FAILED" });
  }
}

export type AnalysisRun = {
  id: string;
  status: string;
  summary: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export async function analyzeCase(caseId: string) {
  return apiFetch<{ analysisRunId: string }>(`/cases/${caseId}/analyze`, { method: "POST" });
}

export async function listAnalysisRuns(caseId: string) {
  return apiFetch<AnalysisRun[]>(`/cases/${caseId}/analysis-runs`);
}

export async function getAnalysisRun(runId: string) {
  return apiFetch<any>(`/analysis-runs/${runId}`);
}

export async function getAnalysisPositions(runId: string) {
  return apiFetch<any>(`/analysis-runs/${runId}/positions`);
}
