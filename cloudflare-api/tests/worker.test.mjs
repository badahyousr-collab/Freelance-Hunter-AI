import test from "node:test";
import assert from "node:assert/strict";
import worker, { bidDurationDays, capitalizeFormalAddress, detectProjectLanguage, detectProjectTimeline, detectedBudget, evaluateProjectMatch, findTelegramEmployerUsername, freelancehuntAutoBidTerms, parseFlRuRss, parseFreelanceRuTasks, proposalSubmissionValidationIssue, proposalValidationIssue } from "../.test-dist/src/index.js";

test("listing language detection distinguishes Russian, Ukrainian, and English", () => {
  assert.equal(detectProjectLanguage("Нужно разработать Telegram-бота для заявок"), "ru");
  assert.equal(detectProjectLanguage("Потрібно розробити Telegram-бота для заявок"), "uk");
  assert.equal(detectProjectLanguage("Build a Telegram bot for project applications"), "en");
  assert.equal(detectProjectLanguage("Je recherche un développeur pour ce projet"), "fr");
  assert.equal(proposalValidationIssue("Je recherche une solution pour votre projet.", "fr"), null);
  assert.equal(proposalValidationIssue("Привет! Какой срок ты рассматриваешь?", "ru"), "informal_address");
  assert.equal(proposalValidationIssue("Здравствуйте! Какой срок Вы рассматриваете?", "ru"), null);
  assert.equal(proposalValidationIssue("Вітаю! Який термін Ви розглядаєте?", "uk"), null);
  assert.equal(proposalValidationIssue("Здравствуйте! Какой срок Вы рассматриваете?", "uk"), "language");
  assert.equal(proposalValidationIssue("Мой опыт работы с Simpla CMS поможет выполнить задачу.", "ru"), "unsupported_experience");
});
test("formal Russian and Ukrainian address is capitalized before validation", () => {
  const russian = capitalizeFormalAddress("Здравствуйте, вы можете уточнить бюджет, который вам подходит?", "ru");
  const ukrainian = capitalizeFormalAddress("Підкажіть, будь ласка, який бюджет ви розглядаєте?", "uk");
  assert.equal(russian, "Здравствуйте, Вы можете уточнить бюджет, который Вам подходит?");
  assert.equal(ukrainian, "Підкажіть, будь ласка, який бюджет Ви розглядаєте?");
  assert.equal(proposalValidationIssue(russian, "ru"), null);
  assert.equal(proposalValidationIssue(ukrainian, "uk"), null);
});

test("automatic marketplace submission rejects stale drafts with unsupported claims", () => {
  const oldDraft = "Здравствуйте! Я уже создал PHP-магазин на Simpla, поэтому выполню задачу.";
  assert.notEqual(proposalSubmissionValidationIssue(oldDraft, "Нужно обновить лендинг на Simpla", "Нужен разработчик PHP", ["HTML", "CSS"]), null);
  assert.equal(proposalSubmissionValidationIssue("Здравствуйте! Могу обсудить Ваш проект. Какой срок Вы рассматриваете?", "Доработка сайта на Python", "Нужно улучшить Django-проект", ["Python", "Django"]), null);
});

test("proposal validation rejects unsupported English experience and reliability claims", () => {
  const skills = ["React", "Next.js", "Node.js", "FastAPI", "Django"];
  assert.equal(proposalValidationIssue("I have extensive experience building full-stack applications with React, Next.js, Node.js, FastAPI, and Django.", "en", skills), "unsupported_experience");
  assert.equal(proposalValidationIssue("I routinely deliver projects on time.", "en", skills), "unsupported_experience");
  assert.equal(proposalValidationIssue("I can use React and Next.js to build the interface for your project.", "en", skills), null);
});

test("AI readiness check reserves enough completion tokens for visible text", async () => {
  const originalFetch = globalThis.fetch;
  let sentBody;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.groq.com/openai/v1/chat/completions") {
      sentBody = JSON.parse(init.body);
      return Response.json({ choices: [{ message: { content: "OK" } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/test-ai", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token" }
    }), { DB: fakeDb(), AI_API_KEY: "test-ai-key", AI_API_BASE_URL: "https://api.groq.com/openai/v1", AI_MODEL: "openai/gpt-oss-20b" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.equal(sentBody.max_completion_tokens, 64);
    assert.equal("max_tokens" in sentBody, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


function fakeDb({ scan = false, telegramChannel = "@python_jobs", existingProject = null, budgetBackfills = [], freelancehuntScan = false, marketplaceSource = null, skills = ["python", "telegram"], telegramAuth = null, telegramCode = null, linkedAccount = null, application = null, fallbackApplication = null, telegramProjects = [], telegramLinkedUserId = null, project = null, recentProjects = [], profile = null, integration = null, notificationTarget = null, agentSettings = null, pendingDraftProjects = [], sourceCount = 0, insertChanges = 1, projectInserts = [], telegramIdentitySchema = true, notificationsSchema = true, submissionSchema = true, providerStatusSchema = true, applicationUpdateNotificationsSchema = true, autoSubmissionSchema = true } = {}) {
  const profileRecalculations = [];
  return {
    get storedIntegration() { return integration; },
    set storedIntegration(value) { integration = value; },
    get applicationRecord() { return application; },
    set applicationRecord(value) { application = value; },
    get insertedProjects() { return projectInserts; },
    get profileRecalculations() { return profileRecalculations; },
    get backfilledProject() { return existingProject; },
    get budgetBackfillWrites() { return budgetBackfills; },
    async batch(statements) { profileRecalculations.push(statements.length); return statements.map(() => ({ meta: { changes: 1 } })); },
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
          if (sql.includes("UPDATE projects SET budget_min=COALESCE")) {
            budgetBackfills.push({ sql, values: [...values] });
            if (existingProject && existingProject.user_id === values[6] && existingProject.source_project_id.toLowerCase() === String(values[7]).toLowerCase() && sql.includes("LOWER(source_project_id)=LOWER(?)")) {
              existingProject = { ...existingProject, budget_min: existingProject.budget_min ?? values[0], budget_max: existingProject.budget_max ?? values[1], currency: existingProject.currency ?? values[2], match_score: values[4], match_reasons: values[5] };
            }
          }
          return { meta: { changes: sql.includes("INSERT INTO projects") ? insertChanges : 1 } };
        },
        async first() {
          if (sql.includes("SELECT tl.telegram_user_id,a.notify_new_projects")) return notificationTarget;
          if (sql.includes("SELECT COALESCE(notify_new_projects,1) AS notify_new_projects")) return { notify_new_projects: 1 };
          if (sql.includes("SELECT telegram_user_id FROM telegram_links WHERE user_id=?")) return telegramLinkedUserId ? { telegram_user_id: telegramLinkedUserId } : null;
          if (sql.includes("SELECT a.id,a.status,a.draft_text,p.source,p.source_project_id,p.url,p.title,p.description,p.budget_min,p.budget_max,p.currency,p.match_score")) return fallbackApplication;
          if (sql.includes("SELECT id FROM applications WHERE user_id=? AND project_id=?")) return application;
          if (sql.includes("SELECT * FROM profiles WHERE user_id=?")) return profile;
          if (sql.includes("SELECT credentials_json FROM integrations WHERE user_id=? AND provider='freelancehunt'")) return integration?.status === "connected" ? integration : null;
          if (sql.includes("SELECT id,provider,label,status,created_at FROM integrations WHERE user_id=? AND provider=?")) return integration ? { id: integration.id, provider: integration.provider, label: integration.label, status: integration.status, created_at: integration.created_at } : null;
          if (sql.includes("SELECT a.id,a.project_id,a.status,a.draft_text,p.source,p.source_project_id,p.url,p.title,p.description FROM applications a JOIN projects")) return application;
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
          if (sql.includes("SELECT COUNT(*) AS total FROM sources")) return { total: sourceCount };
          if (sql.includes("SELECT is_enabled,auto_draft,auto_submit,daily_submission_limit,min_match_score FROM agent_settings WHERE user_id=?")) return agentSettings;
          if (sql.includes("SELECT skills,languages,payment_preferences,min_budget,currency,excluded_keywords")) return { skills: JSON.stringify(skills), languages: '["ru","en"]', payment_preferences: "[]", min_budget: null, currency: "RUB", excluded_keywords: "[]" };
          if (sql.includes("SELECT skills FROM profiles WHERE user_id=?")) return { skills: JSON.stringify(skills) };
          if (sql.includes("SELECT skills, min_budget, currency, excluded_keywords")) return { skills: JSON.stringify(skills), min_budget: null, currency: "USD", excluded_keywords: "[]" };
          if (sql.includes("SELECT min_match_score FROM agent_settings")) return { min_match_score: 60 };
          if (sql.includes("SELECT 1 AS ok")) return { ok: 1 };
          return null;
        },
        async all() {
          if (sql.includes("SELECT telegram_identity,identity_provider,telegram_verified FROM users LIMIT 0") && !telegramIdentitySchema) throw new Error("no such column: telegram_identity");
          if (sql.includes("SELECT notify_new_projects FROM agent_settings LIMIT 0") && !notificationsSchema) throw new Error("no such column: notify_new_projects");
          if (sql.includes("SELECT provider_submission_id,submission_error FROM applications LIMIT 0") && !submissionSchema) throw new Error("no such column: provider_submission_id");
          if (sql.includes("SELECT provider_status FROM applications LIMIT 0") && !providerStatusSchema) throw new Error("no such column: provider_status");
          if (sql.includes("SELECT notify_application_updates FROM agent_settings LIMIT 0") && !applicationUpdateNotificationsSchema) throw new Error("no such column: notify_application_updates");
          if (sql.includes("SELECT auto_submit,daily_submission_limit FROM agent_settings LIMIT 0") && !autoSubmissionSchema) throw new Error("no such column: auto_submit");
          if (sql.includes("sqlite_master") && sql.includes("auth_rate_limits")) {
            return { results: ["users", "sessions", "telegram_auth_codes", "auth_rate_limits", "profiles", "agent_settings", "sources", "projects", "applications", "integrations", "telegram_links"].map(name => ({ name })) };
          }
          if (sql.includes("LEFT JOIN applications a ON a.user_id=p.user_id AND a.project_id=p.id") && sql.includes("AND a.id IS NULL")) return { results: pendingDraftProjects };
          if (sql.includes("SELECT * FROM sources WHERE user_id=? AND is_enabled=1")) {
            if (marketplaceSource) return { results: [{ id: 9, user_id: "user-1", identifier: marketplaceSource === "fl_ru" ? "all" : "public", is_enabled: 1, source: marketplaceSource }] };
            if (freelancehuntScan) return { results: [{ id: 8, user_id: "user-1", source: "freelancehunt", identifier: "", is_enabled: 1 }] };
            if (scan) return { results: [{ id: 7, user_id: "user-1", source: "telegram", identifier: telegramChannel, is_enabled: 1 }] };
          }
          if (sql.includes("FROM projects p LEFT JOIN applications a ON a.user_id=p.user_id AND a.project_id=p.id") && sql.includes("p.match_score>=COALESCE")) return { results: telegramProjects };
          if (sql.includes("FROM projects") && sql.includes("julianday(")) return { results: recentProjects };
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
  const response = await worker.fetch(new Request("https://api.example/health"), { DB: fakeDb({ telegramIdentitySchema: false, notificationsSchema: false, submissionSchema: false, providerStatusSchema: false, applicationUpdateNotificationsSchema: false, autoSubmissionSchema: false }) });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "degraded");
  assert.equal(data.schema, "incomplete");
  assert.deepEqual(data.missing_migrations, ["0007_telegram_only_identity.sql", "0008_new_project_notifications.sql", "0009_provider_submission_tracking.sql", "0010_freelancehunt_status_sync.sql", "0011_application_update_notifications.sql", "0012_auto_submission.sql"]);
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
    AI_API_BASE_URL: "https://provider.example/v1",
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
    marketplace_adapters: ["freelancehunt"],
    freelancehunt_connected: false,
    worker_alerting_configured: false
  });
});

test("agent readiness treats the AI base URL as optional", async () => {
  const response = await worker.fetch(new Request("https://api.example/agent/readiness", {
    headers: { Cookie: "fh_session=test-session-token" }
  }), { DB: fakeDb(), AI_API_KEY: "configured-ai-key", AI_MODEL: "configured-model" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ai_provider_configured, true);
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



test("scan ignores Telegram listings older than 72 hours and listings without a publication date", async () => {
  const originalFetch = globalThis.fetch;
  const oldDate = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
  const freshDate = new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString();
  const html = [
    `<div class="tgme_widget_message_wrap" data-post="python_jobs/201"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer for a freelance project. Budget 500 USD.</div><time datetime="${oldDate}"></time></div>`,
    '<div class="tgme_widget_message_wrap" data-post="python_jobs/202"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer for a freelance project. Budget 500 USD.</div></div>',
    `<div class="tgme_widget_message_wrap" data-post="python_jobs/203"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer for a freelance project. Budget 500 USD.</div><time datetime="${freshDate}"></time></div>`
  ].join("");
  globalThis.fetch = async input => String(input).startsWith("https://t.me/s/python_jobs")
    ? new Response(html, { status: 200, headers: { "Content-Type": "text/html" } })
    : originalFetch(input);
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: fakeDb({ scan: true }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).newProjects, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("Telegram scan backfills an existing listing budget when the source ID casing differs", async () => {
  const originalFetch = globalThis.fetch;
  const publishedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const html = `<div class="tgme_widget_message_wrap" data-post="FreelancehuntProjects/908578"><div class="tgme_widget_message_text js-message_text" dir="auto">Потрібно замінити лендінг інтернет-магазину. 💰 2500&#8239;UAH<br>🛠 #html_и_css_верстка</div><time datetime="${publishedAt}"></time></div>`;
  globalThis.fetch = async input => String(input).startsWith("https://t.me/s/FreelancehuntProjects")
    ? new Response(html, { status: 200, headers: { "Content-Type": "text/html" } })
    : originalFetch(input);
  const db = fakeDb({
    scan: true,
    telegramChannel: "@FreelancehuntProjects",
    insertChanges: 0,
    existingProject: {
      user_id: "user-1",
      source: "telegram",
      source_project_id: "freelancehuntprojects:908578",
      budget_min: null,
      budget_max: null,
      currency: null
    }
  });
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: db });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).newProjects, 0);
    assert.equal(db.budgetBackfillWrites.length, 1);
    assert.match(db.budgetBackfillWrites[0].sql, /LOWER\(source_project_id\)=LOWER\(\?\)/);
    assert.equal(db.backfilledProject.budget_min, 2500);
    assert.equal(db.backfilledProject.budget_max, 2500);
    assert.equal(db.backfilledProject.currency, "UAH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("source creation has no arbitrary per-account limit", async () => {
  const response = await worker.fetch(new Request("https://api.example/sources", {
    method: "POST",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ source: "telegram", identifier: "@fresh_jobs", is_enabled: true })
  }), { DB: fakeDb({ sourceCount: 50 }) });
  assert.notEqual(response.status, 429);
});

test("scheduled scan saves AI drafts and sends a fallback Telegram card when no supported sender can contact the employer", async () => {
  const originalFetch = globalThis.fetch;
  const telegramPayloads = [];
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/203"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer for a freelance project. Budget 500 USD.</div><time datetime="2026-10-16T10:00:00+00:00"></time></div>';
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://t.me/s/python_jobs")) return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    if (url.includes("/chat/completions")) return Response.json({ choices: [{ message: { content: "Hello! I can help build the Telegram bot in Python. What delivery timeframe do you have in mind?" } }] });
    if (url.includes("api.telegram.org/botTEST_TOKEN/sendMessage")) { telegramPayloads.push(JSON.parse(init?.body ?? "{}")); return Response.json({ ok: true, result: { message_id: 77 } }); }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), {
      DB: fakeDb({
        scan: true,
        agentSettings: { is_enabled: 1, auto_draft: 1, min_match_score: 60 },
        pendingDraftProjects: [{ id: 301, source: "telegram", url: "https://t.me/python_jobs/203", title: "Python developer", description: "Telegram bot project", language: "en", budget_min: 500, budget_max: 500, currency: "USD", payment_method: null }],
        telegramLinkedUserId: "12345",
        fallbackApplication: { id: 42, status: "draft", source: "telegram", source_project_id: "python_jobs:203", url: "https://t.me/python_jobs/203", title: "Python developer", description: "Build a Python Telegram bot. Contact @client_person", budget_min: 500, budget_max: 500, currency: "USD", match_score: 84, draft_text: "Hello! I can help with the bot. What delivery timeframe do you have in mind?" }
      }),
      AI_API_KEY: "test-key",
      AI_MODEL: "test-model",
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN"
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.draftedApplications, 1);
    assert.equal(result.notifiedApplications, 1);
    assert.equal(telegramPayloads.length, 1);
    assert.match(telegramPayloads[0].text, /<blockquote>/);
    assert.match(telegramPayloads[0].text, /500 USD/);
    assert.match(telegramPayloads[0].text, /По договорённости/);
    assert.match(telegramPayloads[0].text, /Hello! I can help with the bot/);
    assert.equal(telegramPayloads[0].reply_markup.inline_keyboard[0][0].url, "https://t.me/client_person");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("manual scan ingests and normalizes a public Telegram listing", async () => {
  const originalFetch = globalThis.fetch;
  const html = '<div class="tgme_widget_message_wrap" data-post="python_jobs/123"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div><time datetime="2026-10-17T10:00:00+00:00"></time></div>';
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
  const publishedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const html = `<div class="tgme_widget_message_wrap" data-post="python_jobs/124"><div class="tgme_widget_message_text js-message_text" dir="auto">We need a Python developer to build a Telegram bot for a freelance project. Budget 500 USD.</div><time datetime="${publishedAt}"></time></div>`;
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

test("skill matching recognizes common spelling, abbreviation, and Russian inflection variants", () => {
  const result = evaluateProjectMatch({
    title: "Ищем JS-разработчика для Telegram bot на ReactJS",
    description: "Нужны серверная разработка и интеграция с API.",
    language: "ru",
    profile: { skills: ["JavaScript", "React", "backend-разработка", "Telegram боты", "интеграция API"], languages: ["ru"] }
  });
  assert.equal(result.score >= 60, true);
  assert.deepEqual(result.reasons.filter(reason => reason.startsWith("Совпавшие навыки:")), [
    "Совпавшие навыки: javascript, react, backend-разработка, telegram боты, интеграция api"
  ]);
});

test("updating profile skills immediately recalculates matches for recent projects", async () => {
  const db = fakeDb({
    recentProjects: [{ id: 71, title: "Ищем JS-разработчика", description: "Разработка интерфейса на React", language: "ru", budget_min: null, budget_max: null, currency: "" }]
  });
  const response = await worker.fetch(new Request("https://api.example/profile", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ skills: ["JavaScript", "React"], languages: ["ru"] })
  }), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(db.profileRecalculations, [1]);
});

test("project timeline parser reports agreed timing when absent and reads common Russian and English deadlines", () => {
  assert.equal(detectProjectTimeline("Нужен сайт на React"), "По договорённости");
  assert.equal(detectProjectTimeline("Срок выполнения: 2 недели"), "2 недели");
  assert.equal(detectProjectTimeline("Please deliver within 5 days"), "5 days");
  assert.equal(detectProjectTimeline("Работы нужно завершить до 20.11.2026"), "до 20.11.2026");
});

test("automatic Freelancehunt bids require an explicit deadline and listed supported budget", () => {
  const now = new Date("2026-10-19T10:00:00Z");
  assert.equal(bidDurationDays("Нужен сайт на React", now), null);
  assert.equal(bidDurationDays("Срок выполнения 2 недели", now), 14);
  assert.equal(bidDurationDays("Please deliver within 5 days", now), 5);
  assert.equal(bidDurationDays("Срок 1-2 недели", now), null);
  assert.equal(bidDurationDays("до 22.10.2026", now), 3);
  assert.equal(bidDurationDays("до 18.10.2026", now), null);
  assert.equal(freelancehuntAutoBidTerms({ description: "Срок 5 дней", budget_min: null, budget_max: null, currency: "RUB" }, now), null);
  assert.equal(freelancehuntAutoBidTerms({ description: "Срок 5 дней", budget_min: 5000, budget_max: null, currency: "" }, now), null);
  assert.deepEqual(freelancehuntAutoBidTerms({ description: "Срок выполнения 2 недели", budget_min: 4500, budget_max: 5000, currency: "RUB" }, now), { days: 14, amount: 4500, currency: "RUB" });
});
test("Telegram employer contact extraction ignores the source channel and accepts explicit usernames", () => {
  assert.equal(findTelegramEmployerUsername("Канал @python_jobs. Контакт: @client_person", "python_jobs:45"), "client_person");
  assert.equal(findTelegramEmployerUsername("Ищем разработчика, пишите https://t.me/client_person", "python_jobs:45"), "client_person");
  assert.equal(findTelegramEmployerUsername("Пишите в комментариях канала", "python_jobs:45"), null);
});

test("Telegram projects command sends a full match card with budget, timeline, AI reply, and safe source fallback", async () => {
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.telegram.org/botTEST_TOKEN/sendMessage")) {
      sent.push(JSON.parse(init.body));
      return Response.json({ ok: true, result: { message_id: sent.length } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/telegram/webhook", {
      method: "POST",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret", "Content-Type": "application/json" },
      body: JSON.stringify({ message: { chat: { id: 123, type: "private" }, from: { id: 123 }, text: "/projects" } })
    }), {
      DB: fakeDb({
        linkedAccount: { user_id: "user-1" },
        telegramProjects: [{ id: 8, title: "Python bot", description: "Нужен Telegram-бот на Python, срок выполнения 2 недели", url: "https://fl.ru/projects/123", source: "fl_ru", source_project_id: "123", budget_min: 25000, budget_max: 30000, currency: "RUB", match_score: 83, draft_text: "Здравствуйте! Могу помочь с ботом. Какой срок вам подходит?" }]
      }),
      TELEGRAM_BOT_TOKEN: "TEST_TOKEN",
      TELEGRAM_WEBHOOK_SECRET: "webhook-secret"
    });
    assert.equal(response.status, 200);
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /Python bot/);
    assert.match(sent[0].text, /<blockquote>/);
    assert.match(sent[0].text, /25 000–30 000 RUB/);
    assert.match(sent[0].text, /2 недели/);
    assert.match(sent[0].text, /Какой срок вам подходит/);
    assert.match(sent[0].text, /fl\.ru\/projects\/123/);
    assert.deepEqual(sent[0].reply_markup.inline_keyboard[0][0], { text: "Открыть заказ", url: "https://fl.ru/projects/123" });
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
    ["Оплата: 5000 RUB", { amount: 5000, currency: "RUB" }],
    ["Бюджет: 2 500 UAH", { amount: 2500, currency: "UAH" }],
    ["Оплата 2500 грн", { amount: 2500, currency: "UAH" }],
    ["Бюджет 3 000 гривень", { amount: 3000, currency: "UAH" }],
    ["💰 2500\u202fUAH", { amount: 2500, currency: "UAH" }],
    ["💰 2500&#8239;UAH", { amount: 2500, currency: "UAH" }],
    ["💰 2500&thinsp;UAH", { amount: 2500, currency: "UAH" }]
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


test("manual scan does not send individual Telegram messages for newly inserted projects", async () => {
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
    assert.equal(sentPayload, null, "new listing details must not be sent as individual Telegram messages");
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

test("projects page filters fresh listings by the user match threshold unless all listings are requested", async () => {
  const statements = [];
  const allProjects = [
    { id: 1, title: "Good match", match_score: 82, match_reasons: "[]", application_status: "draft" },
    { id: 2, title: "Weak match", match_score: 24, match_reasons: "[]", application_status: "sent" },
    { id: 3, title: "Not evaluated", match_score: null, match_reasons: "[]", application_status: null }
  ];
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() {
          statements.push({ sql, values: [...values] });
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          if (sql.includes("SELECT min_match_score FROM agent_settings")) return { min_match_score: 55 };
          return null;
        },
        async all() {
          statements.push({ sql, values: [...values] });
          if (!sql.includes("FROM projects") || !sql.includes("julianday(")) return { results: [] };
          const scoreIndex = values.length - 2;
          return { results: sql.includes("match_score>=?")
            ? allProjects.filter(project => project.match_score !== null && project.match_score >= values[scoreIndex])
            : allProjects };
        },
        async run() { return { meta: { changes: 1 } }; }
      };
    }
  };
  const headers = { Cookie: "fh_session=test-session-token" };
  const matchedResponse = await worker.fetch(new Request("https://api.example/projects", { headers }), { DB });
  assert.equal(matchedResponse.status, 200);
  assert.deepEqual((await matchedResponse.json()).map(project => project.id), [1]);
  const defaultQuery = statements.findLast(item => item.sql.includes("FROM projects") && item.sql.includes("julianday("));
  assert.match(defaultQuery.sql, /match_score IS NOT NULL AND match_score>=\?/);
  assert.equal(defaultQuery.values.at(-2), 55);

  const allResponse = await worker.fetch(new Request("https://api.example/projects?matched_only=false", { headers }), { DB });
  assert.equal(allResponse.status, 200);
  const allProjectsResponse = await allResponse.json();
  assert.deepEqual(allProjectsResponse.map(project => project.id), [1, 2, 3]);
  assert.deepEqual(allProjectsResponse.map(project => project.application_status), ["draft", "sent", null]);
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
          published_at: new Date().toISOString(),
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
      title: "Python Telegram bot",
      description: "Build a Telegram bot with Python.",
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

test("Freelancehunt manual submission rejects stale unsupported claims before contacting the marketplace", async () => {
  const db = fakeDb({ skills: ["python", "telegram"] });
  db.applicationRecord = {
    id: 15, project_id: 299173, status: "awaiting_confirmation",
    draft_text: "I have experience with OpenCart and pytest.",
    source: "freelancehunt", source_project_id: "299173",
    title: "OpenCart admin layout update",
    description: "Adjust the order table in an existing OpenCart store.",
    url: "https://freelancehunt.com/project/opencart-layout/299173.html"
  };
  const response = await worker.fetch(new Request("https://api.example/applications/15/submit", {
    method: "POST",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ days: 5, budget_amount: 4500, currency: "RUB", safe_type: "employer" })
  }), { DB: db, INTEGRATION_ENCRYPTION_KEY: "test-integration-encryption-key-0123456789" });
  assert.equal(response.status, 422);
  assert.match((await response.json()).detail, /claims.*not supported/i);
  assert.equal(db.applicationRecord.status, "awaiting_confirmation");
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


test("proposal drafting creates language-matched, profile-grounded drafts", async () => {
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
    },
    {
      language: "uk",
      project: { id: 20, source: "telegram", url: "https://t.me/example/20", title: "Потрібно створити Telegram-бота", description: "Потрібно розробити бота для прийому заявок.", language: "ru", budget_min: null, budget_max: null, currency: null, payment_method: null },
      draft: "Вітаю! Я можу допомогти зі створенням Telegram-бота для прийому заявок. Який термін виконання Ви розглядаєте?"
    }
  ];
  const requests = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://provider.example/v1/chat/completions") {
      const request = JSON.parse(init.body);
      requests.push(request);
      const facts = JSON.parse(request.messages[1].content);
      const scenario = scenarios.find(item => item.project.title === facts.project.title);
      const ukrainianAttempts = requests.filter(item => JSON.parse(item.messages[1].content).project.language === "uk").length;
      const draft = scenario.language === "uk" && ukrainianAttempts === 1 ? "Здравствуйте! Какой срок Вы рассматриваете?" : scenario.draft;
      return Response.json({ choices: [{ message: { content: draft } }] });
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
      assert.equal(response.status, 201, `${scenario.language}: ${JSON.stringify(await response.clone().json())}`);
      const data = await response.json();
      assert.equal(data.status, "draft");
      assert.equal(data.draft_text, scenario.draft);
    }
    assert.equal(requests.length, 4);
    for (const request of requests) {
      assert.equal(request.model, "test-model");
      assert.equal(request.include_reasoning, undefined);
      assert.equal(request.temperature, 0.35);
      assert.match(request.messages[0].content, /untrusted data/i);
      assert.match(request.messages[0].content, /Never state or imply past projects, experience/i);
      assert.match(request.messages[0].content, /ask the client first what delivery date or timeframe they expect/i);
      assert.match(request.messages[0].content, /when both are missing, ask about timing before budget/i);
      assert.match(request.messages[0].content, /Do not claim the proposal has been sent/i);
      assert.equal(request.messages[1].role, "user");
      const facts = JSON.parse(request.messages[1].content);
      assert.deepEqual(facts.user_profile.skills, ["Python", "Telegram bots"]);
      assert.ok(facts.project.listing_url.startsWith("https://t.me/example/"));
      assert.equal(facts.project.expected_timeline, "По договорённости");
      assert.equal(facts.project.language, detectProjectLanguage(facts.project.title + "\n" + facts.project.description));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proposal drafting refuses to save a draft after two language-rule violations", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const db = fakeDb({
    project: { id: 21, source: "telegram", url: "https://t.me/example/21", title: "Потрібно створити Telegram-бота", description: "Потрібно розробити бота для прийому заявок.", language: "ru", budget_min: null, budget_max: null, currency: null },
    profile: { display_name: "Developer", skills: JSON.stringify(["Python"]), languages: JSON.stringify(["ru", "en"]), payment_preferences: "[]", min_budget: null, currency: "RUB" }
  });
  globalThis.fetch = async input => {
    if (String(input) === "https://provider.example/v1/chat/completions") {
      calls += 1;
      return Response.json({ choices: [{ message: { content: "Здравствуйте! Какой срок Вы рассматриваете?" } }] });
    }
    return originalFetch(input);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/applications/21/draft", {
      method: "POST", headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": "198.51.100.83" }
    }), { DB: db, AI_API_KEY: "test-key", AI_API_BASE_URL: "https://provider.example/v1", AI_MODEL: "test-model" });
    assert.equal(response.status, 502);
    assert.match((await response.json()).detail, /No draft was saved/);
    assert.equal(calls, 2);
    assert.equal(db.applicationRecord, null);
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
    assert.match((await failed.json()).detail, /HTTP 429.*quota/i);
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


test("scheduled scan sends an operational Telegram alert when a user scan fails", async () => {
  const DB = {
    prepare(sql) {
      return {
        bind() { return this; },
        async all() {
          if (sql.includes("SELECT DISTINCT s.user_id FROM sources s JOIN agent_settings")) return { results: [{ user_id: "user-1" }] };
          if (sql.includes("SELECT * FROM sources WHERE user_id=? AND is_enabled=1 AND source IN")) throw new Error("synthetic source query failure");
          return { results: [] };
        },
        async first() { return null; },
        async run() { return { meta: { changes: 1 } }; }
      };
    }
  };
  const originalFetch = globalThis.fetch;
  let alertRequest = null;
  globalThis.fetch = async (input, init) => {
    alertRequest = { url: String(input), body: JSON.parse(init.body) };
    return Response.json({ ok: true, result: { message_id: 10 } });
  };
  let scheduledTask;
  try {
    await worker.scheduled({}, { DB, TELEGRAM_BOT_TOKEN: "ops-test-token", WORKER_ALERT_CHAT_ID: "123456" }, {
      waitUntil(task) { scheduledTask = task; }
    });
    await scheduledTask;
    assert.equal(alertRequest.url, "https://api.telegram.org/botops-test-token/sendMessage");
    assert.equal(alertRequest.body.chat_id, "123456");
    assert.match(alertRequest.body.text, /user errors: 1/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("disconnecting Freelancehunt removes its source subscription but keeps discovered projects", async () => {
  const statements = [];
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() {
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          if (sql.includes("SELECT provider FROM integrations WHERE id=? AND user_id=?")) return { provider: "freelancehunt" };
          return null;
        },
        async run() {
          statements.push({ sql, values: [...values] });
          return { meta: { changes: 1 } };
        },
        async all() { return { results: [] }; }
      };
    }
  };
  const response = await worker.fetch(new Request("https://api.example/integrations/7", {
    method: "DELETE",
    headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": "198.51.100.95" }
  }), { DB });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.ok(statements.some(item => item.sql.includes("DELETE FROM integrations WHERE id=? AND user_id=?")));
  const sourceDelete = statements.find(item => item.sql.includes("DELETE FROM sources WHERE user_id=? AND source='freelancehunt'"));
  assert.ok(sourceDelete);
  assert.deepEqual(sourceDelete.values, ["user-1"]);
});


test("CORS allows the production app and rejects unrelated Workers and Pages origins", async () => {
  const DB = fakeDb();
  const allowed = await worker.fetch(new Request("https://api.example/health", {
    headers: { Origin: "https://freelance-hunter-ai.badahyousr.workers.dev" }
  }), { DB });
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://freelance-hunter-ai.badahyousr.workers.dev");
  assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"), "true");

  for (const origin of [
    "https://attacker.workers.dev",
    "https://attacker.pages.dev",
    "https://freelance-hunter-ai.badahyousr.workers.dev.attacker.example",
    "null"
  ]) {
    const response = await worker.fetch(new Request("https://api.example/health", {
      headers: { Origin: origin }
    }), { DB });
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null, origin);
  }
});

test("CORS only permits expected local development ports", async () => {
  const DB = fakeDb();
  const allowed = await worker.fetch(new Request("https://api.example/health", {
    headers: { Origin: "http://localhost:3000" }
  }), { DB });
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000");

  const rejected = await worker.fetch(new Request("https://api.example/health", {
    headers: { Origin: "http://localhost:9999" }
  }), { DB });
  assert.equal(rejected.headers.get("Access-Control-Allow-Origin"), null);
});

test("user-scoped mutation endpoints constrain reads and writes to the authenticated owner", async () => {
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
        async run() { record(); return { meta: { changes: 0 } }; }
      };
    }
  };
  const cases = [
    { path: "/sources/999", method: "PATCH", body: { is_enabled: false }, expectedStatus: 404, sql: "UPDATE sources SET is_enabled=?", ownerPosition: 3 },
    { path: "/applications/999", method: "PATCH", body: { draft_text: "edited" }, expectedStatus: 404, sql: "SELECT id,project_id,status,draft_text FROM applications WHERE id=? AND user_id=?", ownerPosition: 1 },
    { path: "/applications/999/draft", method: "POST", body: {}, expectedStatus: 404, sql: "SELECT id,source,url,title,description,language,budget_min,budget_max,currency,payment_method FROM projects WHERE id=? AND user_id=?", ownerPosition: 1 },
    { path: "/integrations/999", method: "DELETE", expectedStatus: 404, sql: "SELECT provider FROM integrations WHERE id=? AND user_id=?", ownerPosition: 1 }
  ];
  for (const item of cases) {
    const response = await worker.fetch(new Request("https://api.example" + item.path, {
      method: item.method,
      headers: { Cookie: "fh_session=test-session-token", ...(item.body ? { "Content-Type": "application/json" } : {}) },
      ...(item.body ? { body: JSON.stringify(item.body) } : {})
    }), { DB: db, AI_API_KEY: "test-key", AI_MODEL: "test-model" });
    assert.equal(response.status, item.expectedStatus, item.path);
    const statement = statements.findLast(entry => entry.sql.includes(item.sql));
    assert.ok(statement, "Expected scoped SQL for " + item.path);
    assert.equal(statement.values[item.ownerPosition], "user-1", "Authenticated user ID must be bound for " + item.path);
  }

  const profileResponse = await worker.fetch(new Request("https://api.example/profile", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: "Test" })
  }), { DB: db });
  assert.equal(profileResponse.status, 200);
  const profileWrite = statements.findLast(entry => entry.sql.includes("UPDATE profiles SET display_name=?"));
  assert.ok(profileWrite);
  assert.equal(profileWrite.values.at(-1), "user-1");

  const settingsResponse = await worker.fetch(new Request("https://api.example/agent/settings", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: false })
  }), { DB: db });
  assert.equal(settingsResponse.status, 200);
  const settingsWrite = statements.findLast(entry => entry.sql.includes("UPDATE agent_settings SET is_enabled=?"));
  assert.ok(settingsWrite);
  assert.equal(settingsWrite.values.at(-1), "user-1");
});

test("Freelancehunt status sync records provider-confirmed client responses only", async () => {
  const key = "test-integration-encryption-key-0123456789";
  let integration = null;
  const statements = [];
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async run() {
          statements.push({ sql, values: [...values] });
          if (sql.includes("INSERT INTO integrations")) integration = { id: 3, user_id: "user-1", provider: values[1], label: values[2], status: values[3], credentials_json: values[4], created_at: "2026-10-17 10:00:00" };
          if (sql.includes("UPDATE applications SET status='replied'")) return { meta: { changes: 1 } };
          return { meta: { changes: 1 } };
        },
        async first() {
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          if (sql.includes("SELECT attempts FROM auth_rate_limits")) return { attempts: 1 };
          if (sql.includes("SELECT id,provider,label,status,created_at FROM integrations WHERE user_id=? AND provider=?")) return integration ? { id: integration.id, provider: integration.provider, label: integration.label, status: integration.status, created_at: integration.created_at } : null;
          if (sql.includes("SELECT credentials_json FROM integrations WHERE user_id=? AND provider='freelancehunt'")) return integration?.status === "connected" ? { credentials_json: integration.credentials_json } : null;
          if (sql.includes("SELECT tl.telegram_user_id,COALESCE(a.notify_application_updates,1)")) return { telegram_user_id: "12345", notify_application_updates: 1 };
          return null;
        },
        async all() {
          if (sql.includes("SELECT a.id,a.provider_submission_id,a.provider_status,p.source_project_id,p.title,p.url FROM applications")) {
            return { results: [{ id: 12, provider_submission_id: "321", source_project_id: "123", title: "Test project", url: "https://freelancehunt.com/project/123" }] };
          }
          return { results: [] };
        }
      };
    }
  };
  const originalFetch = globalThis.fetch;
  const requests = [];
  let telegramPayload = null;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/my/profile")) return Response.json({ data: { attributes: { login: "test-user" } } });
    if (url.includes("/my/bids?filter[project_id]=123")) {
      return Response.json({ data: [{ id: 321, attributes: { status: "rejected", is_winner: false } }] });
    }
    if (url === "https://api.telegram.org/botnotification-test-token/sendMessage") {
      telegramPayload = JSON.parse(init.body);
      return Response.json({ ok: true, result: { message_id: 88 } });
    }
    throw new Error("Unexpected provider request: " + url);
  };
  try {
    const connect = await worker.fetch(new Request("https://api.example/integrations", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.111" },
      body: JSON.stringify({ provider: "freelancehunt", secret: "provider-test-token" })
    }), { DB, INTEGRATION_ENCRYPTION_KEY: key });
    assert.equal(connect.status, 201);
    const response = await worker.fetch(new Request("https://api.example/integrations/freelancehunt/sync", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": "198.51.100.112" }
    }), { DB, INTEGRATION_ENCRYPTION_KEY: key, TELEGRAM_BOT_TOKEN: "notification-test-token" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      checked: 1,
      updated: 1,
      errors: 0,
      message: "Status sync completed; provider-confirmed replies were recorded."
    });
    assert.ok(requests.some(item => item.url.includes("/my/bids?filter[project_id]=123")));
    assert.equal(telegramPayload.chat_id, "12345");
    assert.match(telegramPayload.text, /Test project/);
    assert.match(telegramPayload.text, /https:\/\/freelancehunt\.com\/project\/123/);
    const write = statements.find(item => item.sql.includes("UPDATE applications SET status='replied'"));
    assert.ok(write);
    assert.deepEqual(write.values, [12, "user-1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("source deletion and Telegram link management remain scoped to the authenticated user", async () => {
  const statements = [];
  const DB = {
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
        async run() { record(); return { meta: { changes: sql.includes("DELETE FROM sources WHERE id=? AND user_id=?") ? 0 : 1 } }; },
        async all() { record(); return { results: [] }; }
      };
    }
  };
  const sourceDelete = await worker.fetch(new Request("https://api.example/sources/987", {
    method: "DELETE",
    headers: { Cookie: "fh_session=test-session-token" }
  }), { DB });
  assert.equal(sourceDelete.status, 404);
  const sourceWrite = statements.findLast(item => item.sql.includes("DELETE FROM sources WHERE id=? AND user_id=?"));
  assert.ok(sourceWrite);
  assert.deepEqual(sourceWrite.values, [987, "user-1"]);

  const linkCode = await worker.fetch(new Request("https://api.example/telegram/link-code", {
    method: "POST",
    headers: { Cookie: "fh_session=test-session-token" }
  }), { DB });
  assert.equal(linkCode.status, 200);
  const codeWrite = statements.findLast(item => item.sql.includes("UPDATE telegram_links SET link_code_hash="));
  assert.ok(codeWrite);
  assert.equal(codeWrite.values.at(-1), "user-1");

  const unlink = await worker.fetch(new Request("https://api.example/telegram/link", {
    method: "DELETE",
    headers: { Cookie: "fh_session=test-session-token" }
  }), { DB });
  assert.equal(unlink.status, 200);
  const unlinkWrite = statements.findLast(item => item.sql.includes("UPDATE telegram_links SET link_code_hash=NULL"));
  assert.ok(unlinkWrite);
  assert.deepEqual(unlinkWrite.values, ["user-1"]);
});


test("agent settings can opt out of client response notifications", async () => {
  const writes = [];
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() {
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          if (sql.includes("SELECT * FROM agent_settings WHERE user_id=?")) return { is_enabled: 1, auto_draft: 1, min_match_score: 60, notify_new_projects: 1, notify_application_updates: 1 };
          return null;
        },
        async run() { writes.push({ sql, values: [...values] }); return { meta: { changes: 1 } }; },
        async all() { return { results: [] }; }
      };
    }
  };
  const response = await worker.fetch(new Request("https://api.example/agent/settings", {
    method: "PATCH",
    headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
    body: JSON.stringify({ notify_application_updates: false })
  }), { DB });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.notify_application_updates, false);
  const update = writes.find(item => item.sql.includes("UPDATE agent_settings SET is_enabled=?"));
  assert.ok(update);
  assert.match(update.sql, /notify_application_updates=\?/);
  assert.equal(update.values[6], 0);
  assert.equal(update.values[7], "user-1");
});


test("user-scoped read, draft, and Telegram link endpoints bind the authenticated owner", async () => {
  const statements = [];
  const DB = {
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
  const cases = [
    { path: "/sources", method: "GET", status: 200, sql: "FROM sources WHERE user_id=?", ownerPosition: 0 },
    { path: "/applications", method: "GET", status: 200, sql: "FROM applications a LEFT JOIN projects", ownerPosition: 0 },
    { path: "/integrations", method: "GET", status: 200, sql: "FROM integrations WHERE user_id=?", ownerPosition: 0 },
    { path: "/profile", method: "GET", status: 200, sql: "FROM profiles WHERE user_id=?", ownerPosition: 0 },
    { path: "/agent/settings", method: "GET", status: 200, sql: "SELECT * FROM agent_settings WHERE user_id=?", ownerPosition: 0 },
    { path: "/applications/999/draft", method: "POST", body: {}, status: 404, sql: "FROM projects WHERE id=? AND user_id=?", ownerPosition: 1 },
    { path: "/telegram/link-code", method: "POST", body: {}, status: 200, sql: "UPDATE telegram_links SET link_code_hash=?", ownerPosition: 1 },
    { path: "/telegram/link", method: "DELETE", status: 200, sql: "UPDATE telegram_links SET link_code_hash=NULL", ownerPosition: 0 }
  ];
  for (const item of cases) {
    const response = await worker.fetch(new Request("https://api.example" + item.path, {
      method: item.method,
      headers: {
        Cookie: "fh_session=test-session-token",
        ...(item.body ? { "Content-Type": "application/json" } : {})
      },
      ...(item.body ? { body: JSON.stringify(item.body) } : {})
    }), { DB, AI_API_KEY: "test-key", AI_MODEL: "test-model" });
    assert.equal(response.status, item.status, item.path);
    const statement = statements.findLast(entry => entry.sql.includes(item.sql));
    assert.ok(statement, "Expected scoped query for " + item.path);
    assert.equal(statement.values[item.ownerPosition], "user-1", "Authenticated user ID must be bound for " + item.path);
  }
});


test("expired website sessions are rejected before user data is read", async () => {
  const statements = [];
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { statements.push({ sql, values: [...values] }); return null; },
        async all() { statements.push({ sql, values: [...values] }); return { results: [] }; },
        async run() { statements.push({ sql, values: [...values] }); return { meta: { changes: 0 } }; }
      };
    }
  };
  const response = await worker.fetch(new Request("https://api.example/profile", {
    headers: { Cookie: "fh_session=expired-session-token" }
  }), { DB });
  assert.equal(response.status, 401);
  const sessionQuery = statements.find(entry => entry.sql.includes("FROM sessions s JOIN users"));
  assert.ok(sessionQuery);
  assert.match(sessionQuery.sql, /s\.expires_at > datetime\('now'\)/);
  assert.notEqual(sessionQuery.values[0], "expired-session-token");
});

test("dashboard summary includes user-scoped source counts and a seven-day discovery series", async () => {
  const statements = [];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() {
          statements.push({ sql, values: [...values] });
          if (sql.includes("FROM sessions s JOIN users")) return { id: "user-1", created_at: "2026-10-16 10:00:00" };
          if (sql.includes("AS telegram_channels_connected")) return {
            projects_found: 11, matched_projects: 5, proposals_sent: 2, client_replies: 1,
            telegram_channels_connected: 3, marketplaces_connected: 1, marketplace_public_sources_connected: 2,
            marketplace_sources_enabled: 3, telegram_bots_connected: 1, agent_enabled: 1
          };
          return null;
        },
        async all() {
          statements.push({ sql, values: [...values] });
          if (sql.includes("date(discovered_at) AS day")) return { results: [
            { day: yesterday, projects_found: 2 }, { day: today, projects_found: 4 }
          ] };
          return { results: [] };
        }
      };
    }
  };
  const response = await worker.fetch(new Request("https://api.example/dashboard/summary", {
    headers: { Cookie: "fh_session=test-session-token" }
  }), { DB });
  assert.equal(response.status, 200);
  const summary = await response.json();
  assert.equal(summary.telegram_channels_connected, 3);
  assert.equal(summary.marketplaces_connected, 1);
  assert.equal(summary.marketplace_public_sources_connected, 2);
  assert.equal(summary.marketplace_sources_enabled, 3);
  assert.equal(summary.telegram_bots_connected, 1);
  assert.equal(summary.agent_enabled, 1);
  assert.equal(summary.daily_activity.length, 7);
  assert.equal(summary.daily_activity.at(-2).projects_found, 2);
  assert.equal(summary.daily_activity.at(-1).projects_found, 4);
  const metricsQuery = statements.find(entry => entry.sql.includes("AS telegram_channels_connected"));
  assert.match(metricsQuery.sql, /source IN \('fl_ru','freelance_ru'\)/);
  assert.deepEqual(metricsQuery.values, Array(11).fill("user-1"));
  const activityQuery = statements.find(entry => entry.sql.includes("date(discovered_at) AS day"));
  assert.deepEqual(activityQuery.values, ["user-1"]);
});

test("Telegram bot summary, project list, and agent control use the linked user's data", async () => {
  const statements = [];
  const DB = {
    prepare(sql) {
      let values = [];
      const record = () => statements.push({ sql, values: [...values] });
      return {
        bind(...args) { values = args; return this; },
        async first() {
          record();
          if (sql.includes("SELECT u.id FROM telegram_links tl JOIN users u")) return { id: "linked-user-2" };
          if (sql.includes("SELECT user_id FROM telegram_links WHERE telegram_user_id=?")) return { user_id: "linked-user-2" };
          if (sql.includes("SELECT (SELECT COUNT(*) FROM projects WHERE user_id=?)")) return { projects_found: 8, matched_projects: 3, proposals_sent: 2, client_replies: 1 };
          return null;
        },
        async all() {
          record();
          if (sql.includes("SELECT p.title,p.url,p.source,p.budget_min,p.budget_max,p.currency,p.published_at FROM projects p WHERE p.user_id=?")) {
            return { results: [{ title: "Linked user's project", url: "https://example.test/project/1", source: "telegram" }] };
          }
          return { results: [] };
        },
        async run() { record(); return { meta: { changes: 1 } }; }
      };
    }
  };
  const headers = { "X-Bot-Secret": "test-bot-secret" };
  const summary = await worker.fetch(new Request("https://api.example/telegram/summary/12345", { headers }), { DB, BOT_API_SECRET: "test-bot-secret" });
  assert.equal(summary.status, 200);
  assert.equal((await summary.json()).projects_found, 8);
  const summaryQuery = statements.find(entry => entry.sql.includes("SELECT (SELECT COUNT(*) FROM projects WHERE user_id=?)"));
  assert.ok(summaryQuery);
  assert.deepEqual(summaryQuery.values, ["linked-user-2", "linked-user-2", "linked-user-2", "linked-user-2"]);

  const projects = await worker.fetch(new Request("https://api.example/telegram/projects/12345?limit=3", { headers }), { DB, BOT_API_SECRET: "test-bot-secret" });
  assert.equal(projects.status, 200);
  assert.equal((await projects.json()).items[0].title, "Linked user's project");
  const projectQuery = statements.find(entry => entry.sql.includes("SELECT p.title,p.url,p.source,p.budget_min,p.budget_max,p.currency,p.published_at FROM projects p WHERE p.user_id=?"));
  assert.ok(projectQuery);
  assert.deepEqual(projectQuery.values, ["linked-user-2", 3]);

  const control = await worker.fetch(new Request("https://api.example/telegram/agent-control", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ telegram_user_id: "12345", enabled: false })
  }), { DB, BOT_API_SECRET: "test-bot-secret" });
  assert.equal(control.status, 200);
  const controlWrite = statements.find(entry => entry.sql.includes("UPDATE agent_settings SET is_enabled=?"));
  assert.ok(controlWrite);
  assert.deepEqual(controlWrite.values, [0, "linked-user-2"]);
});


test("source catalog advertises only implemented discovery adapters", async () => {
  const response = await worker.fetch(new Request("https://api.example/sources/catalog", {
    headers: { Cookie: "fh_session=test-session-token" }
  }), { DB: fakeDb() });
  assert.equal(response.status, 200);
  const catalog = await response.json();
  const bySource = Object.fromEntries(catalog.map(item => [item.source, item]));
  assert.deepEqual(Object.keys(bySource), ["telegram", "fl_ru", "freelance_ru"]);
  assert.ok(bySource.telegram.capabilities.includes("read_public_posts"));
  for (const source of ["fl_ru", "freelance_ru"]) {
    assert.ok(bySource[source].capabilities.includes("read_public_projects"));
    assert.ok(bySource[source].capabilities.includes("manual_submission_only"));
  }
});

test("FL.ru RSS parser keeps recent first-party project listings only", () => {
  const published = new Date(Date.now() - 60_000).toUTCString();
  const stale = new Date(Date.now() - 73 * 60 * 60 * 1000).toUTCString();
  const xml = "<rss><channel>" +
    "<item><title><![CDATA[Сделать Telegram-бота]]></title><link>https://www.fl.ru/projects/123456/</link><description><![CDATA[Нужен бот на Python, бюджет 10 000 ₽]]></description><pubDate>" + published + "</pubDate></item>" +
    "<item><title>Устаревший заказ</title><link>https://www.fl.ru/projects/123457/</link><description>Заказ</description><pubDate>" + stale + "</pubDate></item>" +
    "<item><title>Чужой домен</title><link>https://example.com/projects/123458/</link><description>Заказ</description><pubDate>" + published + "</pubDate></item>" +
    "</channel></rss>";
  const listings = parseFlRuRss(xml);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].id, "/projects/123456");
  assert.equal(listings[0].title, "Сделать Telegram-бота");
  assert.match(listings[0].description, /бюджет 10 000 ₽/);
});

test("Freelance.ru parser keeps only recent tasks visible to everyone", () => {
  const formatMoscow = date => [String(date.getUTCDate()).padStart(2, "0"), String(date.getUTCMonth() + 1).padStart(2, "0"), date.getUTCFullYear()].join(".") + " " + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0");
  const recent = formatMoscow(new Date(Date.now() - 60_000 + 3 * 60 * 60 * 1000));
  const stale = formatMoscow(new Date(Date.now() - 73 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000));
  const card = (id, date, badge = "task-badge--all") => "<article class=\"task-card\"><span class=\"" + badge + "\">Видно всем</span><a class=\"task-card__title-link\" href=\"/task/view/" + id + "\">Разработать Telegram-бота</a><p class=\"task-card__desc\">Нужен бот на Python</p><span class=\"task-chip--cat\">Разработка ботов</span><div class=\"task-card__budget\">10 000 ₽</div><span class=\"task-card__foot-item\" title=\"" + date + "\">Сегодня</span></article>";
  const listings = parseFreelanceRuTasks(card(12, recent) + card(13, stale) + card(14, recent, "task-badge--premium"));
  assert.equal(listings.length, 1);
  assert.equal(listings[0].id, "12");
  assert.equal(listings[0].url, "https://freelance.ru/task/view/12");
  assert.match(listings[0].description, /Разработка ботов/);
  assert.match(listings[0].description, /10 000 ₽/);
});

test("manual scan fetches and saves fresh FL.ru RSS projects", async () => {
  const originalFetch = globalThis.fetch;
  const published = new Date(Date.now() - 60_000).toUTCString();
  const xml = "<rss><channel><item><title>Python Telegram bot</title><link>https://www.fl.ru/projects/334455/</link><description>Need a Python Telegram bot. Budget 500 USD.</description><pubDate>" + published + "</pubDate></item></channel></rss>";
  globalThis.fetch = async input => {
    assert.equal(String(input), "https://www.fl.ru/rss/all.xml");
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/rss+xml" } });
  };
  const projectInserts = [];
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: fakeDb({ marketplaceSource: "fl_ru", projectInserts }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.scannedSources, 1);
    assert.equal(result.newProjects, 1);
    assert.deepEqual(result.errors, []);
    assert.equal(projectInserts[0].values[1], "fl_ru");
    assert.equal(projectInserts[0].values[3], "https://www.fl.ru/projects/334455/");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("manual scan fetches only public Freelance.ru tasks", async () => {
  const originalFetch = globalThis.fetch;
  const moscow = new Date(Date.now() - 60_000 + 3 * 60 * 60 * 1000);
  const date = [String(moscow.getUTCDate()).padStart(2, "0"), String(moscow.getUTCMonth() + 1).padStart(2, "0"), moscow.getUTCFullYear()].join(".") + " " + String(moscow.getUTCHours()).padStart(2, "0") + ":" + String(moscow.getUTCMinutes()).padStart(2, "0");
  const html = "<article class=\"task-card\"><span class=\"task-badge--all\">Видно всем</span><a class=\"task-card__title-link\" href=\"/task/view/556677\">Python Telegram bot</a><p class=\"task-card__desc\">Need a Python Telegram bot. Budget 500 USD.</p><span class=\"task-chip--cat\">Development</span><div class=\"task-card__budget\">500 USD</div><span class=\"task-card__foot-item\" title=\"" + date + "\">Today</span></article>";
  globalThis.fetch = async input => {
    assert.equal(String(input), "https://freelance.ru/task");
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
  };
  const projectInserts = [];
  try {
    const response = await worker.fetch(new Request("https://api.example/agent/scan", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "Content-Type": "application/json" },
      body: "{}"
    }), { DB: fakeDb({ marketplaceSource: "freelance_ru", projectInserts }) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.scannedSources, 1);
    assert.equal(result.newProjects, 1);
    assert.deepEqual(result.errors, []);
    assert.equal(projectInserts[0].values[1], "freelance_ru");
    assert.equal(projectInserts[0].values[3], "https://freelance.ru/task/view/556677");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Groq GPT-OSS proposal requests disable exposed reasoning and use low effort", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.groq.com/openai/v1/chat/completions") {
      requestBody = JSON.parse(init.body);
      return Response.json({ choices: [{ message: { content: "I can help with this project. What delivery timeline are you considering?" } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("https://api.example/applications/19/draft", {
      method: "POST",
      headers: { Cookie: "fh_session=test-session-token", "CF-Connecting-IP": "198.51.100.82" }
    }), {
      DB: fakeDb({
        project: { id: 19, source: "telegram", url: "https://t.me/example/19", title: "AI automation", description: "Need an automation project.", language: "ru", budget_min: null, budget_max: null, currency: "RUB" },
        profile: { display_name: "Developer", skills: JSON.stringify(["Python", "Automation"]), languages: JSON.stringify(["ru"]), payment_preferences: "[]", min_budget: null, currency: "RUB" }
      }),
      AI_API_KEY: "test-key",
      AI_API_BASE_URL: "https://api.groq.com/openai/v1",
      AI_MODEL: "openai/gpt-oss-20b"
    });
    assert.equal(response.status, 201);
    assert.equal(requestBody.include_reasoning, false);
    assert.equal(requestBody.reasoning_effort, "low");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

