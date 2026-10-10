interface Env {
  DB: D1Database;
  APP_ENV?: string;
}

const COOKIE = "fh_session";
const SESSION_DAYS = 14;
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (u.protocol === "https:" && (u.hostname.endsWith(".workers.dev") || u.hostname.endsWith(".pages.dev"))) return origin;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return origin;
  } catch {}
  return null;
}

function cors(request: Request): Headers {
  const h = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  });
  const origin = allowedOrigin(request.headers.get("Origin"));
  if (origin) h.set("Access-Control-Allow-Origin", origin);
  return h;
}

function response(request: Request, data: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = cors(request);
  new Headers(extra).forEach((v, k) => headers.set(k, v));
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}

function cookie(value: string, maxAge: number): string {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}`;
}

function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

async function passwordHash(password: string, salt = randomToken(16)): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 210000, hash: "SHA-256" }, key, 256);
  const digest = Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${digest}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = await passwordHash(password, salt);
  return actual.split(":")[1] === expected;
}

async function body(request: Request): Promise<Record<string, any>> {
  try { const value = await request.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}; }
  catch { return {}; }
}

async function currentUser(request: Request, env: Env): Promise<any | null> {
  const raw = request.headers.get("Cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const tokenHash = await sha256(raw);
  const row = await env.DB.prepare("SELECT u.id, u.email, u.is_verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > datetime('now')").bind(tokenHash).first<any>();
  return row ?? null;
}

async function requireUser(request: Request, env: Env): Promise<any> {
  return currentUser(request, env);
}

const sourceCatalog = [
  { source: "telegram", label: "Public Telegram channels", kind: "telegram", capabilities: ["read_public_posts"], setup_note: "Public channels can be saved now. Live collection requires a configured Telegram ingestion worker and authorized credentials." },
  { source: "kwork", label: "Kwork", kind: "marketplace", capabilities: ["discover_projects"], setup_note: "Configuration only; a tested marketplace adapter is not yet available." },
  { source: "freelancehunt", label: "Freelancehunt", kind: "marketplace", capabilities: ["discover_projects"], setup_note: "Configuration only; a tested marketplace adapter is not yet available." },
  { source: "upwork", label: "Upwork", kind: "marketplace", capabilities: ["discover_projects"], setup_note: "Configuration only; a tested marketplace adapter is not yet available." },
  { source: "fl_ru", label: "FL.ru", kind: "marketplace", capabilities: ["discover_projects"], setup_note: "Configuration only; a tested marketplace adapter is not yet available." }
];

const integrationCatalog = [
  { provider: "telegram", label: "Telegram bot", description: "Link a Telegram bot to receive notifications." },
  { provider: "llm", label: "AI provider", description: "AI drafting integration; provider key storage and live calls are not enabled yet." }
];

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (method === "GET" && (path === "/health" || path === "/")) {
    const check = await env.DB.prepare("SELECT 1 AS ok").first<{ok:number}>();
    return response(request, { status: "ok", database: check?.ok === 1 ? "connected" : "unavailable", service: "freelance-hunter-api" });
  }

  if (path === "/auth/register" && method === "POST") {
    const input = await body(request);
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response(request, { detail: "Enter a valid email address." }, 400);
    if (password.length < 10 || password.length > 256) return response(request, { detail: "Password must contain 10–256 characters." }, 400);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (existing) return response(request, { detail: "An account with this email already exists." }, 409);
    const id = crypto.randomUUID();
    const verificationToken = randomToken(24);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id,email,password_hash,verification_token_hash) VALUES (?,?,?,?)").bind(id, email, await passwordHash(password), await sha256(verificationToken)),
      env.DB.prepare("INSERT INTO profiles (user_id) VALUES (?)").bind(id),
      env.DB.prepare("INSERT INTO agent_settings (user_id) VALUES (?)").bind(id),
      env.DB.prepare("INSERT INTO telegram_links (user_id) VALUES (?)").bind(id)
    ]);
    // Until a free mail-delivery provider is configured, return a development link only outside production.
    const data: Record<string, unknown> = { message: "Account created. Email delivery is not configured yet; verification cannot be sent automatically." };
    if (env.APP_ENV !== "production") data.verification_token = verificationToken;
    return response(request, data, 201);
  }

  if (path === "/auth/verify-email" && method === "POST") {
    const input = await body(request);
    const token = String(input.token ?? "");
    if (!token) return response(request, { detail: "Verification token is required." }, 400);
    const result = await env.DB.prepare("UPDATE users SET is_verified=1, verification_token_hash=NULL WHERE verification_token_hash=?").bind(await sha256(token)).run();
    if (!result.meta.changes) return response(request, { detail: "Verification token is invalid or expired." }, 400);
    return response(request, { message: "Email verified. You can now sign in." });
  }

  if (path === "/auth/login" && method === "POST") {
    const input = await body(request);
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const user = await env.DB.prepare("SELECT id,email,password_hash,is_verified FROM users WHERE email=?").bind(email).first<any>();
    if (!user || !(await verifyPassword(password, user.password_hash))) return response(request, { detail: "Email or password is incorrect." }, 401);
    const token = randomToken();
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now', '+14 days'))").bind(await sha256(token), user.id).run();
    return response(request, { email: user.email, is_verified: Boolean(user.is_verified) }, 200, { "Set-Cookie": cookie(token, SESSION_DAYS * 86400) });
  }

  if (path === "/auth/logout" && method === "POST") {
    const raw = request.headers.get("Cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
    if (raw) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(raw)).run();
    return response(request, { ok: true }, 200, { "Set-Cookie": cookie("", 0) });
  }

  const user = await requireUser(request, env);
  if (path === "/auth/me" && method === "GET") {
    if (!user) return response(request, { detail: "Authentication required." }, 401);
    return response(request, { email: user.email, is_verified: Boolean(user.is_verified) });
  }
  if (!user) return response(request, { detail: "Authentication required." }, 401);
  const uid = user.id as string;

  if (path === "/dashboard/summary" && method === "GET") {
    const row = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM projects WHERE user_id=?) AS projects_found,
      (SELECT COUNT(*) FROM projects WHERE user_id=? AND match_score IS NOT NULL AND match_score >= 60) AS matched_projects,
      (SELECT COUNT(*) FROM applications WHERE user_id=? AND status='sent') AS proposals_sent,
      (SELECT COUNT(*) FROM applications WHERE user_id=? AND replied_at IS NOT NULL) AS client_replies`).bind(uid,uid,uid,uid).first<any>();
    return response(request, row ?? { projects_found: 0, matched_projects: 0, proposals_sent: 0, client_replies: 0 });
  }

  if (path === "/projects" && method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
    const rows = await env.DB.prepare("SELECT * FROM projects WHERE user_id=? ORDER BY discovered_at DESC LIMIT ?").bind(uid, limit).all<any>();
    return response(request, (rows.results ?? []).map((p:any) => ({ ...p, match_reasons: safeJson(p.match_reasons, []) })));
  }

  if (path === "/sources/catalog" && method === "GET") return response(request, sourceCatalog);
  if (path === "/sources" && method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM sources WHERE user_id=? ORDER BY created_at DESC").bind(uid).all<any>();
    return response(request, rows.results ?? []);
  }
  if (path === "/sources" && method === "POST") {
    const input = await body(request);
    const source = String(input.source ?? "");
    const identifier = String(input.identifier ?? "").trim();
    if (!sourceCatalog.some(s => s.source === source)) return response(request, { detail: "Unsupported source type." }, 400);
    if (source === "telegram" && !/^@[a-zA-Z0-9_]{5,}$/.test(identifier)) return response(request, { detail: "Enter a public Telegram channel username such as @python_jobs." }, 400);
    try {
      await env.DB.prepare("INSERT INTO sources (user_id,source,identifier,is_enabled,status) VALUES (?,?,?,?,?)").bind(uid, source, identifier, input.is_enabled === false ? 0 : 1, source === "telegram" ? "configured" : "pending_integration").run();
    } catch { return response(request, { detail: "This source is already configured." }, 409); }
    const row = await env.DB.prepare("SELECT * FROM sources WHERE user_id=? AND source=? AND identifier=?").bind(uid, source, identifier).first<any>();
    return response(request, row, 201);
  }
  const sourceMatch = path.match(/^\/sources\/(\d+)$/);
  if (sourceMatch && method === "PATCH") {
    const input = await body(request);
    const id = Number(sourceMatch[1]);
    const result = await env.DB.prepare("UPDATE sources SET is_enabled=?, status=CASE WHEN ?=1 THEN status ELSE 'paused' END WHERE id=? AND user_id=?").bind(input.is_enabled ? 1 : 0, input.is_enabled ? 1 : 0, id, uid).run();
    if (!result.meta.changes) return response(request, { detail: "Source not found." }, 404);
    return response(request, await env.DB.prepare("SELECT * FROM sources WHERE id=? AND user_id=?").bind(id,uid).first());
  }
  if (sourceMatch && method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM sources WHERE id=? AND user_id=?").bind(Number(sourceMatch[1]),uid).run();
    if (!result.meta.changes) return response(request, { detail: "Source not found." }, 404);
    return response(request, { ok: true });
  }

  if (path === "/profile" && method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM profiles WHERE user_id=?").bind(uid).first<any>();
    return response(request, row ? { ...row, skills: safeJson(row.skills, []), languages: safeJson(row.languages, ["ru","en"]), excluded_keywords: safeJson(row.excluded_keywords, []) } : {});
  }
  if (path === "/profile" && (method === "PATCH" || method === "PUT")) {
    const input = await body(request);
    const existing = await env.DB.prepare("SELECT * FROM profiles WHERE user_id=?").bind(uid).first<any>() ?? {};
    const skills = JSON.stringify(Array.isArray(input.skills) ? input.skills.slice(0,100) : safeJson(existing.skills, []));
    const languages = JSON.stringify(Array.isArray(input.languages) ? input.languages.slice(0,10) : safeJson(existing.languages, ["ru","en"]));
    const excluded = JSON.stringify(Array.isArray(input.excluded_keywords) ? input.excluded_keywords.slice(0,100) : safeJson(existing.excluded_keywords, []));
    const budget = input.min_budget === null ? null : Number.isFinite(Number(input.min_budget)) ? Number(input.min_budget) : existing.min_budget ?? null;
    const currency = String(input.currency ?? existing.currency ?? "USD").slice(0,8);
    await env.DB.prepare("UPDATE profiles SET skills=?,languages=?,excluded_keywords=?,min_budget=?,currency=?,updated_at=datetime('now') WHERE user_id=?").bind(skills,languages,excluded,budget,currency,uid).run();
    return response(request, { ...existing, skills: safeJson(skills,[]), languages: safeJson(languages,["ru","en"]), excluded_keywords: safeJson(excluded,[]), min_budget: budget, currency });
  }

  if (path === "/agent/settings" && method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM agent_settings WHERE user_id=?").bind(uid).first<any>();
    return response(request, row ? { ...row, is_enabled: Boolean(row.is_enabled), auto_draft: Boolean(row.auto_draft) } : {});
  }
  if (path === "/agent/settings" && (method === "PATCH" || method === "PUT")) {
    const input = await body(request);
    const old = await env.DB.prepare("SELECT * FROM agent_settings WHERE user_id=?").bind(uid).first<any>() ?? {};
    const enabled = input.is_enabled === undefined ? Number(old.is_enabled ?? 0) : input.is_enabled ? 1 : 0;
    const autoDraft = input.auto_draft === undefined ? Number(old.auto_draft ?? 1) : input.auto_draft ? 1 : 0;
    const score = Math.max(0,Math.min(100,Math.round(Number(input.min_match_score ?? old.min_match_score ?? 60))));
    await env.DB.prepare("UPDATE agent_settings SET is_enabled=?,auto_draft=?,min_match_score=?,updated_at=datetime('now') WHERE user_id=?").bind(enabled,autoDraft,score,uid).run();
    return response(request, { is_enabled: Boolean(enabled), auto_draft: Boolean(autoDraft), min_match_score: score });
  }
  if (path === "/agent/scan" && method === "POST") return response(request, { detail: "The scan queue is not deployed yet. Source configurations are saved, but live collection is not running." }, 501);

  if (path === "/applications" && method === "GET") {
    const rows = await env.DB.prepare("SELECT a.*, p.title AS project_title, p.url AS project_url, p.source AS project_source FROM applications a LEFT JOIN projects p ON p.id=a.project_id AND p.user_id=a.user_id WHERE a.user_id=? ORDER BY a.created_at DESC").bind(uid).all<any>();
    return response(request, (rows.results ?? []).map((a:any) => ({ id:a.id, project_id:a.project_id, status:a.status, draft_text:a.draft_text, created_at:a.created_at, submitted_at:a.submitted_at, replied_at:a.replied_at, project:a.project_title ? { title:a.project_title, url:a.project_url, source:a.project_source } : null })));
  }

  if (path === "/integrations/catalog" && method === "GET") return response(request, integrationCatalog);
  if (path === "/integrations" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id,provider,label,status,created_at FROM integrations WHERE user_id=? ORDER BY created_at DESC").bind(uid).all<any>();
    return response(request, rows.results ?? []);
  }
  if (path === "/integrations" && method === "POST") {
    const input = await body(request);
    const provider = String(input.provider ?? "");
    const item = integrationCatalog.find(i => i.provider === provider);
    if (!item) return response(request, { detail: "Unsupported integration." }, 400);
    const label = String(input.label ?? item.label).slice(0,100);
    // Credentials are intentionally not accepted until encryption/key management is configured.
    await env.DB.prepare("INSERT INTO integrations (user_id,provider,label,status,credentials_json) VALUES (?,?,?,?, '{}') ON CONFLICT(user_id,provider) DO UPDATE SET label=excluded.label").bind(uid,provider,label,"not_connected").run();
    return response(request, await env.DB.prepare("SELECT id,provider,label,status,created_at FROM integrations WHERE user_id=? AND provider=?").bind(uid,provider).first(), 201);
  }
  const integrationMatch = path.match(/^\/integrations\/(\d+)$/);
  if (integrationMatch && method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM integrations WHERE id=? AND user_id=?").bind(Number(integrationMatch[1]),uid).run();
    if (!result.meta.changes) return response(request, { detail: "Integration not found." }, 404);
    return response(request, { ok: true });
  }

  if (path === "/telegram/link-code" && method === "POST") {
    const code = randomToken(6).toUpperCase();
    await env.DB.prepare("UPDATE telegram_links SET link_code_hash=?,expires_at=datetime('now','+10 minutes') WHERE user_id=?").bind(await sha256(code),uid).run();
    return response(request, { code, expires_in_seconds: 600, message: "Link codes are temporary. Telegram bot exchange is not deployed yet." });
  }
  if (path === "/telegram/link" && method === "DELETE") {
    await env.DB.prepare("UPDATE telegram_links SET link_code_hash=NULL,expires_at=NULL,telegram_user_id=NULL,linked_at=NULL WHERE user_id=?").bind(uid).run();
    return response(request, { ok: true });
  }

  return response(request, { detail: "Not found." }, 404);
}

function safeJson(value: unknown, fallback: unknown): any {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      // Avoid leaking database details, credentials, or stack traces to callers.
      return response(request, { detail: "Internal server error. Check the Cloudflare Worker logs." }, 500);
    }
  }
};
