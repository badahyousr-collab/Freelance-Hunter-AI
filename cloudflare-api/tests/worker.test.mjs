import test from "node:test";
import assert from "node:assert/strict";
import worker from "../.test-dist/src/index.js";

function fakeDb({ scan = false, skills = ["python", "telegram"] } = {}) {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async run() { return { meta: { changes: 1 } }; },
        async first() {
          if (sql.includes("SELECT attempts FROM auth_rate_limits")) return { attempts: 1 };
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", email: "test@example.com", is_verified: 1 };
          if (sql.includes("SELECT COUNT(*) AS total FROM sources")) return { total: 0 };
          if (sql.includes("SELECT skills, min_budget, currency, excluded_keywords")) return { skills: JSON.stringify(skills), min_budget: null, currency: "USD", excluded_keywords: "[]" };
          if (sql.includes("SELECT min_match_score FROM agent_settings")) return { min_match_score: 60 };
          if (sql.includes("SELECT 1 AS ok")) return { ok: 1 };
          return null;
        },
        async all() {
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
  assert.deepEqual(await response.json(), { status: "ok", database: "connected", service: "freelance-hunter-api" });
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

test("production registration fails closed until email delivery is configured", async () => {
  const response = await worker.fetch(new Request("https://api.example/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.20" },
    body: JSON.stringify({ email: "test@example.com", password: "long-enough-password" })
  }), { DB: fakeDb(), APP_ENV: "production" });
  assert.equal(response.status, 503);
  assert.match((await response.json()).detail, /email verification is not configured/i);
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
