import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return Response.json({ detail: "Cross-origin request rejected." }, { status: 403 });
    }
  }
  const upstreamBase = process.env.CLOUDFLARE_API_URL?.trim().replace(/\/+$/, "");
  if (!upstreamBase) {
    return Response.json(
      { detail: "API is not configured yet. Set CLOUDFLARE_API_URL in the frontend Worker environment." },
      { status: 503 }
    );
  }

  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = new URL(`${upstreamBase}/${path.map(encodeURIComponent).join("/")}`);
  target.search = incoming.search;

  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "authorization"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, { ...init, signal: AbortSignal.timeout(15000) });
  } catch {
    return Response.json(
      { detail: "Не удалось связаться с API Freelance Hunter. Проверь адрес API Worker и его доступность." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (upstream.status >= 500 && !contentType.toLowerCase().includes("application/json")) {
    return Response.json(
      { detail: `API Worker вернул ошибку HTTP ${upstream.status}. Проверь статус API Worker в Cloudflare.` },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  const responseHeaders = new Headers();
  for (const name of ["content-type", "set-cookie", "cache-control", "www-authenticate"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
