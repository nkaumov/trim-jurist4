import type { ApiResponse } from "./api-types";
import { cookies } from "next/headers";

const baseUrl =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return { ok: true, data: undefined as any };
  return JSON.parse(text) as ApiResponse<T>;
}

export async function serverApiFetch<T>(path: string, init?: RequestInit) {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  const json = await parseJson<T>(res);
  if (!res.ok || !json.ok) return null;
  return json.data;
}
