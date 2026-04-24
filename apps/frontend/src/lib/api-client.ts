import type { ApiResponse } from "./api-types";

const baseUrl = "";

export class ApiClientError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; details?: unknown }) {
    super(message);
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return { ok: true, data: undefined as any };
  return JSON.parse(text) as ApiResponse<T>;
}

export function apiFetch<T>(
  path: string,
  init?: RequestInit & { expectNoBody?: false | undefined },
): Promise<T>;
export function apiFetch(
  path: string,
  init: RequestInit & { expectNoBody: true },
): Promise<Response>;
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { expectNoBody?: boolean },
): Promise<T | Response> {
  const res = await fetch(`${baseUrl}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (init?.expectNoBody) return res;

  const json = await parseJson<T>(res);
  if (!res.ok || !json.ok) {
    const err = !json.ok
      ? json.error
      : { code: "HTTP_ERROR", message: `HTTP ${res.status}` };
    throw new ApiClientError(err.message, { code: err.code, status: res.status, details: err.details });
  }

  return json.data;
}
