import test from "node:test";
import assert from "node:assert/strict";
import worker from "../.test-dist/src/index.js";

function fakeDb({ scan = false, skills = ["python", "telegram"], telegramAuth = null, telegramCode = null, linkedAccount = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async run() { return { meta: { changes: 1 } }; },
        async first() {
          if (sql.includes("SELECT attempts FROM auth_rate_limits")) return { attempts: 1 };
          if (sql.includes("SELECT user_id,authenticated_at,session_issued_at,error_message FROM telegram_auth_codes")) return telegramAuth;
          if (sql.includes("SELECT code_hash,auth_mode FROM telegram_auth_codes")) return telegramCode;
          if (sql.includes("SELECT user_id FROM telegram_links WHERE telegram_user_id=?")) return linkedAccount;
          if (sql.includes("SELECT email,is_verified,auth_method FROM users")) return { email: "telegram-123@telegram.local", is_verified: 1, auth_method: "telegram" };
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", email: "test@example.com", is_verified: 1 };
          if (sql.includes("SELECT COUNT(*) AS total FROM sources")) return { total: 0 };
          if (sql.includes("SELECT skills, min_budget, currency, excluded_keywords")) return { skills: JSON.stringify(skills), min_budget: null, currency: "USD", excluded_keywords: "[]" };
          if (sql.includes("SELECT min_match_score FROM agent_settings")) return { min_match_score: 60 };
          if (sql.includes("SELECT 1 AS ok")) return { ok: 1 };
          return null;
        },
        async all() {
          if (sql.includes("sqlite_master") && sql.includes("auth_rate_limits")) {
            return { results: ["users", "sessions", "telegram_auth_codes", "auth_rate_limits"].map(name => ({ name })) };
          }
          if (scan && sql.includes("SELECT * FROM sources WHERE user_id=? AND is_enabled=1 AND source='telegram'")) {
            return { results: [{ id: 7, user_id: "user-1", source: "telegram", identifier: "@python_jobs", is_enabled: 1 }] };
          }
          return { results: [] };
        }
      };
    }
  };
}

test("health endpoint confirms a reachable D1 binding", async () => {
  const response = await worker.fetch(new Request("https://api.example/health"), { DB: fakeDb() });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "connected", schema: "ready", service: "freelance-hunter-api" });
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

test("email registration is disabled in favor of Telegram authentication", async () => {
  const response = await worker.fetch(new Request("https://api.example/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.20" },
    body: JSON.stringify({ email: "test@example.com", password: "long-enough-password" })
  }), { DB: fakeDb(), APP_ENV: "production" });
  assert.equal(response.status, 410);
  assert.match((await response.json()).detail, /through Telegram|Telegram/i);
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
  assert.deepEqual(await response.json(), { authenticated: true, email: null });
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


test("manual scan skips listings below the configured relevance threshold", async () => {
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
    assert.equal(result.newProjects, 0);
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
