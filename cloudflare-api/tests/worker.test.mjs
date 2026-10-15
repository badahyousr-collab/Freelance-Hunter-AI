import test from "node:test";
import assert from "node:assert/strict";
import worker from "../.test-dist/src/index.js";

function fakeDb() {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async run() { return { meta: { changes: 1 } }; },
        async first() {
          if (sql.includes("SELECT attempts FROM auth_rate_limits")) return { attempts: 1 };
          if (sql.includes("SELECT 1 AS ok")) return { ok: 1 };
          return null;
        },
        async all() { return { results: [] }; }
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
  const response = await worker.fetch(new Request("https://api.example/not-a-route"), { DB: fakeDb() });
  assert.equal(response.status, 404);
  assert.equal(typeof (await response.json()).detail, "string");
});
