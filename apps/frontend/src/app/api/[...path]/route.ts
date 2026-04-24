import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

function buildBackendUrl(pathname: string, search: string) {
  const normalized = pathname.replace(/^\/api/, "");
  return `${backendBaseUrl}${normalized}${search}`;
}

async function proxy(request: Request) {
  const url = new URL(request.url);
  const target = buildBackendUrl(url.pathname, url.search);

  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(target, {
    method: request.method,
    headers,
    body: request.body,
    // Required for streaming request bodies (e.g. multipart) in Node fetch
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    duplex: "half",
    cache: "no-store",
  });

  const responseHeaders = new Headers(res.headers);
  const setCookies = res.headers.getSetCookie?.() ?? [];
  responseHeaders.delete("set-cookie");

  const nextRes = new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });

  for (const c of setCookies) nextRes.headers.append("set-cookie", c);
  return nextRes;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;

