import test from "node:test";
import assert from "node:assert/strict";
import worker, { detectedBudget, evaluateProjectMatch } from "../.test-dist/src/index.js";

function fakeDb({ scan = false, freelancehuntScan = false, skills = ["python", "telegram"], telegramAuth = null, telegramCode = null, linkedAccount = null, application = null, project = null, profile = null, integration = null, notificationTarget = null, insertChanges = 1, projectInserts = [], telegramIdentitySchema = true, notificationsSchema = true, submissionSchema = true, providerStatusSchema = true } = {}) {
  return {
    get storedIntegration() { return integration; },
    set storedIntegration(value) { integration = value; },
    get applicationRecord() { return application; },
    set applicationRecord(value) { application = value; },
    get insertedProjects() { return projectInserts; },
    async batch(statements) { return statements.map(() => ({ meta: { changes: 1 } })); },
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async run() {
          if (sql.includes("UPDATE applications SET draft_text=?,status=?")) {
            application = application ? { ...application, draft_text: values[0], status: values[1] } : application;
          }
          if (sql.includes("INSERT INTO applications (user_id,project_id,status,draft_text)")) {
            application = { id: 42, project_id: values[1], status: "draft", draft_text: values[2], created_at: "2026-10-17 10:00:00", submitted_at: null, replied_at: null };
          }
          if (sql.includes("UPDATE applications SET status='submitting'")) {
            application = application ? { ...application, status: "submitting", submission_error: null } : application;
          }
          if (sql.includes("UPDATE applications SET status='sent'")) {
            application = application ? { ...application, status: "sent", submitted_at: "2026-10-17 10:30:00", provider_submission_id: values[0], submission_error: null } : application;
          }
          if (sql.includes("UPDATE applications SET provider_status=?,provider_is_winner=?,provider_status_synced_at")) {
            application = application ? { ...application, provider_status: values[0], provider_is_winner: values[1], provider_status_synced_at: "2026-10-17 10:30:00" } : application;
          }
          if (sql.includes("UPDATE applications SET status=?,submission_error=?")) {
            application = application ? { ...application, status: values[0], submission_error: values[1] } : application;
          }
          if (sql.includes("UPDATE applications SET submission_error=NULL")) {
            application = application ? { ...application, submission_error: null } : application;
          }
          if (sql.includes("UPDATE integrations SET status='reauth_required'")) {
            integration = integration ? { ...integration, status: "reauth_required" } : integration;
          }
          if (sql.includes("INSERT INTO integrations")) {
            integration = { id: 1, user_id: "user-1", provider: values[1], label: values[2], status: values[3], credentials_json: values[4] ?? "{}", created_at: "2026-10-17 10:00:00" };
          }
          if (sql.includes("INSERT INTO projects")) projectInserts.push({ sql, values: [...values] });
          return { meta: { changes: sql.includes("INSERT INTO projects") ? insertChanges : 1 } };
        },
        async first() {
          if (sql.includes("SELECT tl.telegram_user_id,a.notify_")) return notificationTarget;
          if (sql.includes("SELECT credentials_json FROM integrations WHERE user_id=? AND provider='freelancehunt'")) return integration?.status === "connected" ? integration : null;
          if (sql.includes("SELECT id,provider,label,status,created_at FROM integrations WHERE user_id=? AND provider=?")) return integration ? { id: integration.id, provider: integration.provider, label: integration.label, status: integration.status, created_at: integration.created_at } : null;
          if (sql.includes("SELECT a.id,a.project_id,a.status,a.draft_text,p.source,p.source_project_id,p.url FROM applications a JOIN projects")) return application;
          if (sql.includes("SELECT id,project_id,status,draft_text,created_at,submitted_at,replied_at,provider_submission_id,submission_error FROM applications WHERE id=? AND user_id=?")) return application;
          if (sql.includes("SELECT id,project_id,status,draft_text FROM applications WHERE id=? AND user_id=?")) return application;
          if (sql.includes("SELECT id,project_id,status,draft_text,created_at,submitted_at,replied_at FROM applications WHERE id=? AND user_id=?")) return application;
          if (sql.includes("SELECT id,project_id,status,draft_text,created_at,submitted_at,replied_at FROM applications WHERE user_id=? AND project_id=?")) return application;
          if (sql.includes("SELECT id,source,url,title,description,language,budget_min,budget_max,currency,payment_method FROM projects WHERE id=? AND user_id=?")) return project;
          if (sql.includes("SELECT display_name,skills,languages,payment_preferences,min_budget,currency FROM profiles WHERE user_id=?")) return profile;
          if (sql.includes("SELECT attempts FROM auth_rate_limits")) return { attempts: 1 };
          if (sql.includes("SELECT user_id,authenticated_at,session_issued_at,error_message FROM telegram_auth_codes")) return telegramAuth;
          if (sql.includes("SELECT code_hash,auth_mode FROM telegram_auth_codes")) return telegramCode;
          if (sql.includes("SELECT user_id FROM telegram_links WHERE telegram_user_id=?")) return linkedAccount;
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          if (sql.includes("SELECT COUNT(*) AS total FROM sources")) return { total: 0 };
          if (sql.includes("SELECT skills,languages,payment_preferences,min_budget,currency,excluded_keywords")) return { skills: JSON.stringify(skills), languages: '["ru","en"]', payment_preferences: "[]", min_budget: null, currency: "RUB", excluded_keywords: "[]" };
          if (sql.includes("SELECT skills, min_budget, currency, excluded_keywords")) return { skills: JSON.stringify(skills), min_budget: null, currency: "USD", excluded_keywords: "[]" };
          if (sql.includes("SELECT min_match_score FROM agent_settings")) return { min_match_score: 60 };
          if (sql.includes("SELECT 1 AS ok")) return { ok: 1 };
          return null;
        },
        async all() {
          if (sql.includes("SELECT telegram_identity,identity_provider,telegram_verified FROM users LIMIT 0") && !telegramIdentitySchema) throw new Error("no such column: telegram_identity");
          if (sql.includes("SELECT notify_new_projects FROM agent_settings LIMIT 0") && !notificationsSchema) throw new Error("no such column: notify_new_projects");
          if (sql.includes("SELECT provider_submission_id,submission_error FROM applications LIMIT 0") && !submissionSchema) throw new Error("no such column: provider_submission_id");
          if ((sql.includes("SELECT provider_status,provider_is_winner,provider_status_synced_at FROM applications LIMIT 0") || sql.includes("SELECT notify_application_updates FROM agent_settings LIMIT 0")) && !providerStatusSchema) throw new Error("no such column: provider_status");
          if (sql.includes("sqlite_master") && sql.includes("auth_rate_limits")) {
            return { results: ["users", "sessions", "telegram_auth_codes", "auth_rate_limits", "profiles", "agent_settings", "sources", "projects", "applications", "integrations", "telegram_links"].map(name => ({ name })) };
          }
          if (sql.includes("SELECT a.id,a.provider_submission_id,a.provider_status,a.provider_is_winner,p.title AS project_title,p.url AS project_url FROM applications a JOIN projects")) {
            return { results: application ? [application] : [] };
          }
          if (sql.includes("SELECT * FROM sources WHERE user_id=? AND is_enabled=1")) {
            if (freelancehuntScan) return { results: [{ id: 8, user_id: "user-1", source: "freelancehunt", identifier: "", is_enabled: 1 }] };
            if (scan) return { results: [{ id: 7, user_id: "user-1", source: "telegram", identifier: "@python_jobs", is_enabled: 1 }] };
          }
          return { results: [] };
        }
      };
    }
  };
}

test("health endpoint confirms a reachable D1 binding and required schema", async () => {
  const response = await worker.fetch(new Request("https://api.example/health"), { DB: fakeDb() });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "connected", schema: "ready", service: "freelance-hunter-api" });
});

test("health endpoint reports missing Telegram identity and notification migrations", async () => {
  const response = await worker.fetch(new Request("https://api.example/health"), { DB: fakeDb({ telegramIdentitySchema: false, notificationsSchema: false, submissionSchema: false, providerStatusSchema: false }) });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "degraded");
  assert.equal(data.schema, "incomplete");
  assert.deepEqual(data.missing_migrations, ["0007_telegram_only_identity.sql", "0008_new_project_notifications.sql", "0009_provider_submission_tracking.sql", "0010_provider_status_notifications.sql"]);
});

test("Telegram webhook rejects requests when webhook secrets are not configured", async () => {
  const response = await worker.fetch(new Request("https://api.example/telegram/webhook", { method: "POST", body: "{}" }), { DB: fakeDb() });
  assert.equal(response.status, 503);
  assert.match((await response.json()).detail, /secrets are not configured/i);
});

test("Telegram webhook rejects an invalid Telegram secret token", async () => {
  const response = await worker.fetch(new Request("https://api.example/telegram/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong", "Content-Type": "application/json" },
    body: "{}"
  }), { DB: fakeDb(), TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_WEBHOOK_SECRET: "correct-secret" });
  assert.equal(response.status, 401);
});

test("agent readiness reflects provider and bot configuration", async () => {
  const response = await worker.fetch(new Request("https://api.example/agent/readiness", {
    headers: { Cookie: "fh_session=test-session-token" }
  }), {
    DB: fakeDb(),
    AI_API_KEY: "configured-ai-key",
    AI_MODEL: "configured-model",
    TELEGRAM_BOT_TOKEN: "configured-bot-token",
    TELEGRAM_WEBHOOK_SECRET: "configured-webhook-secret",
    BOT_API_SECRET: "configured-bot-api-secret"
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    worker_runtime: true,
    cron_configured: true,
    telegram_bot_configured: true,
    ai_provider_configured: true,
    marketplace_adapters: []
  });
});

test("email registration is disabled in favor of Telegram authentication", async () => {
  const response = await worker.fetch(new Request("https://api.example/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.20" },
    body: JSON.stringify({ email: "test@example.com", password: "long-enough-password" })
  }), { DB: fakeDb(), APP_ENV: "production" });
  assert.equal(response.status, 410);
  assert.match((await response.json()).detail, /through Telegram|Telegram/i);
});

test("email login, verification, and password recovery endpoints are disabled", async () => {
  const paths = [
    "/auth/login",
    "/auth/verify-email",
    "/auth/password-reset/request",
    "/auth/password-reset/confirm"
  ];
  for (const path of paths) {
    const response = await worker.fetch(new Request("https://api.example" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.25" },
      body: JSON.stringify({ email: "test@example.com", password: "long-enough-password", token: "old-token" })
    }), { DB: fakeDb(), APP_ENV: "production" });
    assert.equal(response.status, 410, path + " should be disabled");
  }
});

test("Telegram auth start returns a nine-digit code valid for ten minutes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes("api.telegram.org/botTEST_TOKEN/getMe")) {
      return Response.json({ ok: true, result: { username: "freelance_hunter_test_bot" } });
    }
    return originalFetch(input);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/auth/telegram/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.21" },
      body: "{}"
    }), { DB: fakeDb(), TELEGRAM_BOT_TOKEN: "TEST_TOKEN", TELEGRAM_WEBHOOK_SECRET: "webhook-secret" });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.match(data.code, /^\d{9}$/);
    assert.equal(data.expires_in_seconds, 600);
    assert.equal(data.bot_url, "https://t.me/freelance_hunter_test_bot");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Telegram auth status creates a session after the bot confirms the code", async () => {
  const response = await worker.fetch(new Request("https://api.example/auth/telegram/status", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.22" },
    body: JSON.stringify({ code: "123456789" })
  }), { DB: fakeDb({ telegramAuth: { user_id: "user-1", authenticated_at: "2026-10-15 10:00:00", session_issued_at: null } }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true, identity_provider: "telegram" });
  assert.match(response.headers.get("set-cookie") ?? "", /fh_session=.*HttpOnly/);
});


test("Telegram auth status exposes duplicate-registration errors to the website", async () => {
  const response = await worker.fetch(new Request("https://api.example/auth/telegram/status", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.23" },
    body: JSON.stringify({ code: "123456789" })
  }), {
    DB: fakeDb({ telegramAuth: {
      user_id: null,
      authenticated_at: null,
      session_issued_at: null,
      error_message: "Этот Telegram уже зарегистрирован. Перейди на страницу входа и войди в существующий аккаунт."
    } })
  });
  assert.equal(response.status, 409);
  assert.match((await response.json()).detail, /уже зарегистрирован/i);
});

test("unknown API route returns a structured 404", async () => {
  const response = await worker.fetch(new Request("https://api.example/not-a-route", { headers: { Cookie: "fh_session=test-session-token" } }), { DB: fakeDb() });
  assert.equal(response.status, 404);
  assert.equal(typeof (await response.json()).detail, "string");
});


test("manual scan ingests and normalizes a public Telegram listing", async () => {
  const originalFetch = globalThis.fetch;
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/123"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div><time datetime="2026-10-15T10:00:00+00:00"></time></div>';
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://t.me/s/python_jobs")) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: fakeDb({ scan: true }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.scannedSources, 1);
    assert.equal(result.newProjects, 1);
    assert.deepEqual(result.errors, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("manual scan persists low-relevance listings for the matching stage", async () => {
  const originalFetch = globalThis.fetch;
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/124"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div></div>';
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://t.me/s/python_jobs")) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: fakeDb({ scan: true, skills: ["python"] }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.scannedSources, 1);
    assert.equal(result.newProjects, 1);
    assert.deepEqual(result.errors, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});



test("Telegram /start asks the user to send a plain code without a command", async () => {
  const originalFetch = globalThis.fetch;
  let sentPayload;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sentPayload = JSON.parse(init.body);
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/telegram/webhook", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ message: { chat: { id: 123, type: "private" }, from: { id: 123 }, text: "/start" } })
    }), { DB: fakeDb(), TELEGRAM_BOT_TOKEN: "TEST_TOKEN", TELEGRAM_WEBHOOK_SECRET: "webhook-secret" });
    assert.equal(response.status, 200);
    assert.match(sentPayload.text, /отправь сюда 9-значный код/i);
    assert.match(sentPayload.text, /никаких команд/i);
    assert.doesNotMatch(sentPayload.text, /\/link/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("Telegram plain code creates a new account when registration is valid", async () => {
  const originalFetch = globalThis.fetch;
  let sentPayload;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sentPayload = JSON.parse(init.body);
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/telegram/webhook", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ message: { chat: { id: 123, type: "private" }, from: { id: 123 }, text: "123456789" } })
    }), {
      DB: fakeDb({ telegramCode: { code_hash: "code-hash", auth_mode: "register" } }),
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN",
      TELEGRAM_WEBHOOK_SECRET: "webhook-secret"
    });
    assert.equal(response.status, 200);
    assert.match(sentPayload.text, /аккаунт создан/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Telegram plain code detects an already registered account during registration", async () => {
  const originalFetch = globalThis.fetch;
  let sentPayload;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sentPayload = JSON.parse(init.body);
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/telegram/webhook", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ message: { chat: { id: 123, type: "private" }, from: { id: 123 }, text: "123456789" } })
    }), {
      DB: fakeDb({
        telegramCode: { code_hash: "code-hash", auth_mode: "register" },
        linkedAccount: { user_id: "already-registered-user" }
      }),
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN",
      TELEGRAM_WEBHOOK_SECRET: "webhook-secret"
    });
    assert.equal(response.status, 200);
    assert.match(sentPayload.text, /уже зарегистрирован/i);
    assert.match(sentPayload.text, /страницу входа/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Telegram help command sends readable multiline text and keyboard", async () => {
  const originalFetch = globalThis.fetch;
  let sentPayload;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sentPayload = JSON.parse(init.body);
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/telegram/webhook", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ message: { chat: { id: 123 }, from: { id: 123 }, text: "/help" } })
    }), { DB: fakeDb(), TELEGRAM_BOT_TOKEN: "TEST_TOKEN", TELEGRAM_WEBHOOK_SECRET: "webhook-secret" });
    assert.equal(response.status, 200);
    assert.match(sentPayload.text, /Как войти/);
    assert.match(sentPayload.text, /обычным сообщением/);
    assert.doesNotMatch(sentPayload.text, /Команды:\\n/);
    assert.equal(sentPayload.reply_markup.keyboard.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("budget parser handles Russian and international currency formats", () => {
  const cases = [
    ["Бюджет: 15 000 ₽", { amount: 15000, currency: "RUB" }],
    ["оплата 12,5 тыс. руб.", { amount: 12500, currency: "RUB" }],
    ["до 1.500 USD", { amount: 1500, currency: "USD" }],
    ["$2,500", { amount: 2500, currency: "USD" }],
    ["€1 200,50", { amount: 1200.5, currency: "EUR" }],
    ["Budget 2.5k USD", { amount: 2500, currency: "USD" }],
    ["Оплата: 5000 RUB", { amount: 5000, currency: "RUB" }]
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(detectedBudget(input), expected, input);
  }
});

test("budget parser ignores missing currency, zero, and unreasonable values", () => {
  assert.equal(detectedBudget("Опыт от 2020 года"), null);
  assert.equal(detectedBudget("Бюджет: 0 ₽"), null);
  assert.equal(detectedBudget("Оплата 9999999999 RUB"), null);
});


test("application review can edit a draft and move it to awaiting confirmation", async () => {
  const db = fakeDb({ application: { id: 4, project_id: 9, status: "draft", draft_text: "Initial draft", created_at: "2026-10-17 09:00:00", submitted_at: null, replied_at: null } });
  const response = await worker.fetch(new Request("https://api.example/applications/4", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ draft_text: "Edited proposal", status: "awaiting_confirmation" })
  }), { DB: db });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.status, "awaiting_confirmation");
  assert.equal(result.draft_text, "Edited proposal");
});

test("application review cannot fake a provider-confirmed sent status", async () => {
  const db = fakeDb({ application: { id: 4, project_id: 9, status: "draft", draft_text: "Proposal" } });
  const response = await worker.fetch(new Request("https://api.example/applications/4", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ status: "sent" })
  }), { DB: db });
  assert.equal(response.status, 400);
  assert.match((await response.json()).detail, /supported marketplace adapter/i);
});

test("application review returns not found for records outside the current user's scope", async () => {
  const response = await worker.fetch(new Request("https://api.example/applications/4", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ draft_text: "Edited proposal" })
  }), { DB: fakeDb() });
  assert.equal(response.status, 404);
});


test("manual scan sends one Telegram message for newly inserted projects when notifications are enabled", async () => {
  const originalFetch = globalThis.fetch;
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/777"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div><time datetime="2026-10-17T10:00:00+00:00"></time></div>';
  let sentPayload = null;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://t.me/s/python_jobs")) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    if (url.includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sentPayload = JSON.parse(init.body);
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), {
      DB: fakeDb({ scan: true, notificationTarget: { telegram_user_id: "12345", notify_new_projects: 1 } }),
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN"
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).newProjects, 1);
    assert.equal(sentPayload.chat_id, 12345);
    assert.match(sentPayload.text, /Новые проекты: 1/);
    assert.ok(sentPayload.text.includes("python_jobs/777"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("manual scan does not send notifications when the user opted out", async () => {
  const originalFetch = globalThis.fetch;
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/778"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div></div>';
  let sendCount = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://t.me/s/python_jobs")) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    if (url.includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sendCount += 1;
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), {
      DB: fakeDb({ scan: true, notificationTarget: { telegram_user_id: "12345", notify_new_projects: 0 } }),
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN"
    });
    assert.equal(response.status, 200);
    assert.equal(sendCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("manual scan does not notify about duplicate listings that were not inserted", async () => {
  const originalFetch = globalThis.fetch;
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/779"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div></div>';
  let sendCount = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://t.me/s/python_jobs")) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    if (url.includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sendCount += 1;
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), {
      DB: fakeDb({ scan: true, notificationTarget: { telegram_user_id: "12345", notify_new_projects: 1 }, insertChanges: 0 }),
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN"
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).newProjects, 0);
    assert.equal(sendCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("user-scoped dashboard endpoints bind all reads to the authenticated user", async () => {
  const statements = [];
  const db = {
    prepare(sql) {
      let values = [];
      const record = () => statements.push({ sql, values: [...values] });
      return {
        bind(...args) { values = args; return this; },
        async first() {
          record();
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          return null;
        },
        async all() { record(); return { results: [] }; },
        async run() { record(); return { meta: { changes: 1 } }; }
      };
    }
  };
  const paths = ["/projects", "/sources", "/profile", "/agent/settings", "/applications", "/integrations", "/dashboard/summary"];
  for (const path of paths) {
    const response = await worker.fetch(new Request("https://api.example" + path, {
      headers: { Cookie: "fh_session=test-session-token" }
    }), { DB: db });
    assert.equal(response.status, 200, path);
  }

  const protectedQueries = [
    "FROM projects WHERE user_id=?",
    "FROM sources WHERE user_id=?",
    "FROM profiles WHERE user_id=?",
    "FROM agent_settings WHERE user_id=?",
    "FROM applications a LEFT JOIN projects",
    "FROM integrations WHERE user_id=?",
    "FROM projects WHERE user_id=? AND match_score"
  ];
  for (const fragment of protectedQueries) {
    const query = statements.find(item => item.sql.includes(fragment));
    assert.ok(query, "Expected user-scoped query containing " + fragment);
    assert.ok(query.values.includes("user-1"), "Expected authenticated user ID bound for " + fragment);
  }
});

test("protected project data is not returned without a session", async () => {
  const response = await worker.fetch(new Request("https://api.example/projects"), { DB: fakeDb() });
  assert.equal(response.status, 401);
  assert.match((await response.json()).detail, /authentication required/i);
});


test("Freelancehunt token is validated, encrypted, and used to ingest official API projects", async () => {
  const originalFetch = globalThis.fetch;
  const token = "test-freelancehunt-token";
  const encryptionKey = "test-integration-encryption-key-0123456789";
  const db = fakeDb({ freelancehuntScan: true, skills: ["python", "telegram"] });
  const requests = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, headers: init?.headers, body: init?.body });
    if (url === "https://api.freelancehunt.com/v2/my/profile") {
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      return Response.json({ data: { attributes: { login: "test_freelancer" } } });
    }
    if (url === "https://api.freelancehunt.com/v2/projects") {
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      return Response.json({ data: [{
        id: 299172,
        type: "project",
        attributes: {
          name: "Python Telegram bot",
          description_html: "<p>Need a Python developer to build a Telegram bot.</p>",
          budget: { amount: 5000, currency: "RUB" },
          safe_type: "employer",
          published_at: "2026-10-17T09:00:00+00:00",
          self: { web: "https://freelancehunt.com/project/python-telegram-bot/299172.html" }
        }
      }] });
    }
    return originalFetch(input, init);
  };
  try {
    const connectResponse = await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freelancehunt", secret: token })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(connectResponse.status, 201);
    const connected = await connectResponse.json();
    assert.equal(connected.status, "connected");
    assert.equal(connected.label, "Freelancehunt · test_freelancer");
    assert.equal(JSON.stringify(connected).includes(token), false);
    assert.ok(db.storedIntegration.credentials_json.includes("ciphertext"));
    assert.equal(db.storedIntegration.credentials_json.includes(token), false);

    const scanResponse = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(scanResponse.status, 200);
    const result = await scanResponse.json();
    assert.equal(result.scannedSources, 1);
    assert.equal(result.newProjects, 1);
    assert.deepEqual(result.errors, []);
    assert.equal(db.insertedProjects.length, 1);
    assert.equal(db.insertedProjects[0].values[1], "299172");
    assert.equal(db.insertedProjects[0].values[2], "https://freelancehunt.com/project/python-telegram-bot/299172.html");
    assert.equal(db.insertedProjects[0].values[6], 5000);
    assert.ok(requests.some(item => item.url === "https://api.freelancehunt.com/v2/projects"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Freelancehunt invalid tokens are rejected without saving credentials", async () => {
  const originalFetch = globalThis.fetch;
  let saved = false;
  const db = fakeDb();
  const originalPrepare = db.prepare.bind(db);
  db.prepare = sql => {
    const prepared = originalPrepare(sql);
    if (sql.includes("INSERT INTO integrations")) {
      const originalRun = prepared.run.bind(prepared);
      prepared.run = async (...args) => { saved = true; return originalRun(...args); };
    }
    return prepared;
  };
  globalThis.fetch = async input => {
    if (String(input) === "https://api.freelancehunt.com/v2/my/profile") return Response.json({ error: { title: "Unauthorized" } }, { status: 401 });
    return originalFetch(input);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freelancehunt", secret: "invalid-token" })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: "test-integration-encryption-key-0123456789" });
    assert.equal(response.status, 401);
    assert.equal(saved, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("Freelancehunt bid submission requires confirmation and records only provider-confirmed success", async () => {
  const originalFetch = globalThis.fetch;
  const token = "test-freelancehunt-token-for-bid";
  const encryptionKey = "test-integration-encryption-key-0123456789";
  const db = fakeDb();
  let bidRequests = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://api.freelancehunt.com/v2/my/profile") {
      return Response.json({ data: { attributes: { login: "test_freelancer" } } });
    }
    if (url === "https://api.freelancehunt.com/v2/projects/299172/bids") {
      bidRequests += 1;
      assert.equal(init.method, "POST");
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      assert.deepEqual(JSON.parse(init.body), {
        days: 5,
        budget: { amount: 4500, currency: "RUB" },
        safe_type: "employer",
        comment: "I can build the requested Telegram bot."
      });
      return Response.json({ data: { id: 3119168 } }, { status: 201 });
    }
    return originalFetch(input, init);
  };
  try {
    const connect = await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freelancehunt", secret: token })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(connect.status, 201);
    db.applicationRecord = {
      id: 5, project_id: 299172, status: "awaiting_confirmation",
      draft_text: "I can build the requested Telegram bot.",
      source: "freelancehunt", source_project_id: "299172",
      url: "https://freelancehunt.com/project/python-telegram-bot/299172.html",
      created_at: "2026-10-17 10:00:00", submitted_at: null, replied_at: null,
      provider_submission_id: null, submission_error: null
    };

    const response = await worker.fetch(new Request("https://api.example/applications/5/submit", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ days: 5, budget_amount: 4500, currency: "RUB", safe_type: "employer" })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, "sent");
    assert.equal(result.provider_submission_id, "3119168");
    assert.ok(result.submitted_at);
    assert.equal(bidRequests, 1);

    const duplicate = await worker.fetch(new Request("https://api.example/applications/5/submit", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ days: 5, budget_amount: 4500, currency: "RUB", safe_type: "employer" })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(duplicate.status, 409);
    assert.equal(bidRequests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Freelancehunt submission rejects drafts that were not prepared for confirmation", async () => {
  const response = await worker.fetch(new Request("https://api.example/applications/5/submit", {
    method: "POST",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ days: 5, budget_amount: 4500, currency: "RUB", safe_type: "employer" })
  }), {
    DB: fakeDb({ application: {
      id: 5, project_id: 299172, status: "draft", draft_text: "Proposal",
      source: "freelancehunt", source_project_id: "299172", url: "https://freelancehunt.com/"
    } }),
    INTEGRATION_ENCRYPTION_KEY: "test-integration-encryption-key-0123456789"
  });
  assert.equal(response.status, 409);
});


test("Freelancehunt ambiguous server failures block automatic resubmission", async () => {
  const originalFetch = globalThis.fetch;
  const token = "test-freelancehunt-token-timeout";
  const encryptionKey = "test-integration-encryption-key-0123456789";
  const db = fakeDb();
  let bidRequests = 0;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url === "https://api.freelancehunt.com/v2/my/profile") return Response.json({ data: { attributes: { login: "test_freelancer" } } });
    if (url === "https://api.freelancehunt.com/v2/projects/299172/bids") {
      bidRequests += 1;
      return Response.json({ error: { title: "Temporary error" } }, { status: 500 });
    }
    return originalFetch(input);
  };
  try {
    await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freelancehunt", secret: token })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    db.applicationRecord = {
      id: 6, project_id: 299172, status: "awaiting_confirmation", draft_text: "I can build this bot.",
      source: "freelancehunt", source_project_id: "299172", url: "https://freelancehunt.com/project/299172.html",
      created_at: "2026-10-17 10:00:00", submitted_at: null, replied_at: null,
      provider_submission_id: null, submission_error: null
    };
    const request = () => new Request("https://api.example/applications/6/submit", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ days: 3, budget_amount: 1000, currency: "RUB", safe_type: "employer" })
    });
    const response = await worker.fetch(request(), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.application.status, "submission_unknown");
    const duplicate = await worker.fetch(request(), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(duplicate.status, 409);
    assert.equal(bidRequests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("proposal drafting creates Russian and English drafts from profile-grounded listing facts", async () => {
  const originalFetch = globalThis.fetch;
  const scenarios = [
    {
      language: "ru",
      project: { id: 17, source: "telegram", url: "https://t.me/example/17", title: "Нужен Telegram-бот на Python", description: "Нужно разработать Telegram-бота для обработки заявок. Бюджет 15 000 RUB.", language: "ru", budget_min: 15000, budget_max: 15000, currency: "RUB", payment_method: "fixed" },
      draft: "Здравствуйте! Могу помочь разработать Telegram-бота на Python для обработки заявок. Предлагаю сначала согласовать сценарии и структуру данных, затем реализовать и проверить основные функции."
    },
    {
      language: "en",
      project: { id: 18, source: "telegram", url: "https://t.me/example/18", title: "Build a Python Telegram bot", description: "Build a bot to collect project applications. Budget: $300.", language: "en", budget_min: 300, budget_max: 300, currency: "USD", payment_method: "fixed" },
      draft: "Hi! I can help build a Python Telegram bot to collect project applications. I would start by confirming the user flow and data structure, then implement and test the core features."
    }
  ];
  const requests = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://provider.example/v1/chat/completions") {
      requests.push(JSON.parse(init.body));
      return Response.json({ choices: [{ message: { content: scenarios[requests.length - 1].draft } }] });
    }
    return originalFetch(input, init);
  };
  try {
    for (const scenario of scenarios) {
      const response = await worker.fetch(new Request("https://api.example/applications/" + scenario.project.id + "/draft", {
        method: "POST",
        headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": scenario.language === "ru" ? "198.51.100.80" : "198.51.100.81" }
      }), {
        DB: fakeDb({
          project: scenario.project,
          profile: { display_name: "Developer", skills: JSON.stringify(["Python", "Telegram bots"]), languages: JSON.stringify(["ru", "en"]), payment_preferences: "[]", min_budget: 100, currency: scenario.language === "ru" ? "RUB" : "USD" }
        }),
        AI_API_KEY: "test-key",
        AI_API_BASE_URL: "https://provider.example/v1",
        AI_MODEL: "test-model"
      });
      assert.equal(response.status, 201);
      const data = await response.json();
      assert.equal(data.status, "draft");
      assert.equal(data.draft_text, scenario.draft);
    }
    assert.equal(requests.length, 2);
    for (const request of requests) {
      assert.equal(request.model, "test-model");
      assert.equal(request.temperature, 0.35);
      assert.match(request.messages[0].content, /untrusted data/i);
      assert.match(request.messages[0].content, /Never invent experience/i);
      assert.match(request.messages[0].content, /Do not claim the proposal has been sent/i);
      assert.equal(request.messages[1].role, "user");
      const facts = JSON.parse(request.messages[1].content);
      assert.deepEqual(facts.user_profile.skills, ["Python", "Telegram bots"]);
      assert.ok(facts.project.listing_url.startsWith("https://t.me/example/"));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proposal drafting reports missing provider configuration and upstream failures without creating sent applications", async () => {
  const project = { id: 19, source: "telegram", url: "https://t.me/example/19", title: "Python bot", description: "Build a Python Telegram bot", language: "en", budget_min: 200, budget_max: 200, currency: "USD", payment_method: "fixed" };
  const profile = { display_name: null, skills: JSON.stringify(["Python"]), languages: JSON.stringify(["en"]), payment_preferences: "[]", min_budget: 100, currency: "USD" };
  const noConfig = await worker.fetch(new Request("https://api.example/applications/19/draft", {
    method: "POST", headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": "198.51.100.82" }
  }), { DB: fakeDb({ project, profile }) });
  assert.equal(noConfig.status, 503);
  assert.match((await noConfig.json()).detail, /AI drafting is not configured/i);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: { message: "quota exceeded" } }, { status: 429 });
  try {
    const failed = await worker.fetch(new Request("https://api.example/applications/19/draft", {
      method: "POST", headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": "198.51.100.83" }
    }), { DB: fakeDb({ project, profile }), AI_API_KEY: "test-key", AI_MODEL: "test-model" });
    assert.equal(failed.status, 502);
    assert.match((await failed.json()).detail, /AI provider request failed/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("scheduled scans continue for later users when one user's source query fails", async () => {
  const visitedUsers = [];
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async all() {
          if (sql.includes("SELECT DISTINCT s.user_id FROM sources s JOIN agent_settings")) {
            return { results: [{ user_id: "user-1" }, { user_id: "user-2" }] };
          }
          if (sql.includes("SELECT * FROM sources WHERE user_id=? AND is_enabled=1")) {
            visitedUsers.push(values[0]);
            if (values[0] === "user-1") throw new Error("synthetic source query failure");
            return { results: [] };
          }
          return { results: [] };
        },
        async run() { return { meta: { changes: 1 } }; },
        async first() { return null; }
      };
    }
  };
  let scheduledTask;
  await worker.scheduled({}, { DB }, { waitUntil(task) { scheduledTask = task; } });
  await scheduledTask;
  assert.deepEqual(visitedUsers, ["user-1", "user-2"]);
});


test("Freelancehunt bid status sync stores changes and sends one Telegram notification", async () => {
  const originalFetch = globalThis.fetch;
  const token = "test-freelancehunt-token-status";
  const encryptionKey = "test-integration-encryption-key-0123456789";
  const db = fakeDb({
    application: {
      id: 7, project_id: 299172, status: "sent", draft_text: "Proposal",
      source: "freelancehunt", source_project_id: "299172",
      provider_submission_id: "3119168", provider_status: "active", provider_is_winner: 0,
      project_title: "Python Telegram bot",
      project_url: "https://freelancehunt.com/project/python-telegram-bot/299172.html",
      created_at: "2026-10-17 10:00:00", submitted_at: "2026-10-17 10:30:00", replied_at: null
    },
    notificationTarget: { telegram_user_id: "12345", notify_application_updates: 1 }
  });
  let telegramNotifications = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://api.freelancehunt.com/v2/my/profile") {
      return Response.json({ data: { attributes: { login: "test_freelancer" } } });
    }
    if (url === "https://api.freelancehunt.com/v2/my/bids") {
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer " + token);
      return Response.json({ data: [{ id: 3119168, attributes: { status: "rejected", is_winner: false } }] });
    }
    if (url.includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      telegramNotifications += 1;
      const payload = JSON.parse(init.body);
      assert.match(payload.text, /Статус: отклонён/);
      assert.match(payload.text, /Python Telegram bot/);
      return Response.json({ ok: true, result: { message_id: 9 } });
    }
    return originalFetch(input, init);
  };
  try {
    const connect = await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freelancehunt", secret: token })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    assert.equal(connect.status, 201);

    const syncRequest = () => new Request("https://api.example/agent/sync-status", {
      method: "POST", headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" }, body: "{}"
    });
    const response = await worker.fetch(syncRequest(), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey, TELEGRAM_BOT_TOKEN: "TEST_TOKEN" });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.checked, 1);
    assert.equal(result.changed, 1);
    assert.equal(db.applicationRecord.provider_status, "rejected");
    assert.equal(telegramNotifications, 1);

    const repeated = await worker.fetch(syncRequest(), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey, TELEGRAM_BOT_TOKEN: "TEST_TOKEN" });
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).changed, 0);
    assert.equal(telegramNotifications, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Freelancehunt status sync respects the per-user notification opt-out", async () => {
  const originalFetch = globalThis.fetch;
  const token = "test-freelancehunt-token-optout";
  const encryptionKey = "test-integration-encryption-key-0123456789";
  const db = fakeDb({
    application: {
      id: 8, project_id: 299173, status: "sent", draft_text: "Proposal",
      source: "freelancehunt", source_project_id: "299173",
      provider_submission_id: "3119169", provider_status: "active", provider_is_winner: 0,
      project_title: "Automation task", project_url: "https://freelancehunt.com/project/automation/299173.html"
    },
    notificationTarget: { telegram_user_id: "12345", notify_application_updates: 0 }
  });
  let telegramNotifications = 0;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url === "https://api.freelancehunt.com/v2/my/profile") return Response.json({ data: { attributes: { login: "test_freelancer" } } });
    if (url === "https://api.freelancehunt.com/v2/my/bids") return Response.json({ data: [{ id: 3119169, attributes: { status: "rejected", is_winner: false } }] });
    if (url.includes("api.telegram.org/botTEST_TOKEN/sendMessage")) { telegramNotifications += 1; return Response.json({ ok: true, result: { message_id: 10 } }); }
    return originalFetch(input);
  };
  try {
    await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST", headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "freelancehunt", secret: token })
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey });
    const response = await worker.fetch(new Request("https://api.example/agent/sync-status", {
      method: "POST", headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" }, body: "{}"
    }), { DB: db, INTEGRATION_ENCRYPTION_KEY: encryptionKey, TELEGRAM_BOT_TOKEN: "TEST_TOKEN" });
    assert.equal(response.status, 200);
    assert.equal(db.applicationRecord.provider_status, "rejected");
    assert.equal(telegramNotifications, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
