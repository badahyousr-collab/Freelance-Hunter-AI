import { expect, test, type Page } from "@playwright/test";

async function mockAuthenticatedAccount(page: Page) {
  await page.route("**/api/backend/auth/me", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ identity_provider: "telegram", created_at: "2026-10-16T10:00:00Z", telegram_user_id: "12345", telegram_linked_at: "2026-10-16T10:00:00Z" })
    });
  });
}

for (const path of ["/login", "/register"]) {
  test(`${path} uses Telegram only and has no email/password form`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: path === "/login" ? "Войди в аккаунт" : "Создай аккаунт" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Продолжить через Telegram/ })).toBeVisible();
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(path === "/register" ? /Регистрация через Telegram/i : /Вход через Telegram/i)).toBeVisible();
  });
}

test("Telegram auth displays a short-lived code and a link to the bot", async ({ page }) => {
  await page.route("**/api/backend/auth/telegram/start", async route => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        code: "123456789",
        expires_in_seconds: 600,
        bot_url: "https://t.me/freelance_hunter_test_bot"
      })
    });
  });
  await page.route("**/api/backend/auth/telegram/status", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false, status: "pending" })
    });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: /Продолжить через Telegram/ }).click();
  await expect(page.locator(".telegram-code")).toHaveText("123456789");
  await expect(page.getByRole("link", { name: /Открыть Telegram-бота/ })).toHaveAttribute("href", "https://t.me/freelance_hunter_test_bot");
  await expect(page.locator(".auth-message")).toContainText("Код действует 10 минут");
});


test("source catalog can add a public Telegram job channel", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  const savedSources: Array<Record<string, unknown>> = [];
  await page.route("**/api/backend/sources/catalog", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        source: "telegram",
        label: "Public Telegram channels",
        kind: "telegram",
        capabilities: ["read_public_posts"],
        setup_note: "Public channel previews are scanned on demand."
      }])
    });
  });
  await page.route("**/api/backend/integrations", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/backend/sources", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedSources) });
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    const handle = String(payload.identifier ?? "");
    if (savedSources.some(item => item.identifier === handle)) {
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "This source is already configured." }) });
      return;
    }
    const item = { id: savedSources.length + 1, source: "telegram", identifier: handle, is_enabled: true, status: "configured", created_at: "2026-10-16T10:00:00Z", last_scan_at: null, last_error: null, last_discovered_count: 0 };
    savedSources.push(item);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(item) });
  });

  await page.route("**/api/backend/agent/scan", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ scannedSources: 1, newProjects: 3, errors: [], message: "Scan completed." })
    });
  });
  let agentEnabled = false;
  await page.route("**/api/backend/agent/settings", async route => {
    if (route.request().method() === "PATCH") agentEnabled = Boolean(route.request().postDataJSON().enabled);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: agentEnabled, auto_draft: false, auto_submit: false, daily_submission_limit: 10, notify_application_updates: true, telegram_linked: true }) });
  });

  await page.goto("/sources");
  await page.locator(".source-group-summary").filter({ hasText: "Подборка Telegram-каналов" }).click();
  const channel = page.locator(".sub-list-row").filter({ hasText: "Вакансии для разработчиков ботов" });
  await expect(channel.getByRole("button", { name: "Добавить" })).toBeVisible();
  await channel.getByRole("button", { name: "Добавить" }).click();
  await expect(page.getByText(/Канал @job_for_bots добавлен/i)).toBeVisible();
  await page.locator(".source-group-summary").filter({ hasText: "Показать подключённые источники" }).click();
  await expect(page.locator(".sub-list-row").filter({ hasText: "@job_for_bots" }).getByText(/Добавлен|Включён/).first()).toBeVisible();
  await page.goto("/agent");
  await page.getByRole("button", { name: "Включить агента" }).click();
  await expect(page.getByText(/Агент включён\. Первый проход завершён: новых проектов 3/i)).toBeVisible();
});


test("source catalog can connect FL.ru and Freelance.ru as draft-only sources", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  const savedSources: Array<Record<string, unknown>> = [];
  const submitted: Array<Record<string, unknown>> = [];
  await page.route("**/api/backend/sources/catalog", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { source: "telegram", label: "Telegram", kind: "telegram", capabilities: ["read_public_posts"], setup_note: "Public channels." },
      { source: "fl_ru", label: "FL.ru", kind: "marketplace", capabilities: ["read_public_projects", "generate_drafts", "manual_submission_only"], setup_note: "RSS-заказы." },
      { source: "freelance_ru", label: "Freelance.ru", kind: "marketplace", capabilities: ["read_public_projects", "generate_drafts", "manual_submission_only"], setup_note: "Открытые задания." }
    ]) });
  });
  await page.route("**/api/backend/integrations", async route => {
    await integrationResponseReady;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/backend/sources", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedSources) });
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    submitted.push(payload);
    const item = { id: savedSources.length + 1, source: payload.source, identifier: payload.identifier, is_enabled: true, status: "configured", created_at: "2026-10-18T10:00:00Z", last_scan_at: null, last_error: null, last_discovered_count: 0 };
    savedSources.push(item);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(item) });
  });

  let resolveIntegrationResponse!: () => void;
  const integrationResponseReady = new Promise<void>(resolve => { resolveIntegrationResponse = resolve; });
  await page.goto("/sources");
  const marketplaceAccordion = page.locator(".source-group-summary").filter({ hasText: "Фриланс-биржи" });
  await expect(marketplaceAccordion).toContainText("Проверяем подключения…");
  resolveIntegrationResponse();
  await expect(marketplaceAccordion).toContainText("0 из 3 подключено");
  await expect(page.locator("article.sub-list-row").filter({ hasText: "FL.ru" })).toBeHidden();
  await marketplaceAccordion.click();
  await expect(page.locator("article.sub-list-row").filter({ hasText: "FL.ru" })).toBeVisible();
  await expect(page.locator("article.sub-list-row").filter({ hasText: "Freelance.ru" })).toBeVisible();
  await expect(page.getByText(/без регистрации/)).toBeVisible();
  await expect(page.getByText(/отправить его нужно вручную/)).toHaveCount(2);
  const flRow = page.locator("article.sub-list-row").filter({ hasText: "FL.ru" });
  await expect(flRow.getByRole("link", { name: "Открыть биржу" })).toHaveAttribute("href", "https://www.fl.ru/projects/");
  await flRow.getByRole("button", { name: "Подключить поиск" }).click();
  await expect(page.getByText(/FL\.ru подключён для поиска новых заказов/)).toBeVisible();
  await expect(flRow.getByText("Поиск подключён", { exact: true })).toBeVisible();
  await expect(flRow.getByRole("button", { name: "Подключить поиск" })).toHaveCount(0);
  await page.locator("article.sub-list-row").filter({ hasText: "Freelance.ru" }).getByRole("button", { name: "Подключить поиск" }).click();
  expect(submitted).toEqual([
    { source: "fl_ru", identifier: "all", is_enabled: true },
    { source: "freelance_ru", identifier: "public", is_enabled: true }
  ]);
});

test("connected Freelancehunt token can enable the missing scheduled search source", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  const savedSources: Array<Record<string, unknown>> = [];
  const submitted: Array<Record<string, unknown>> = [];
  await page.route("**/api/backend/sources/catalog", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { source: "telegram", label: "Telegram", kind: "telegram", capabilities: ["read_public_posts"], setup_note: "Public channels." },
      { source: "freelancehunt", label: "Freelancehunt", kind: "marketplace", capabilities: ["read_projects", "generate_drafts", "submit_bids"], setup_note: "Official API." },
      { source: "fl_ru", label: "FL.ru", kind: "marketplace", capabilities: ["read_public_projects", "generate_drafts", "manual_submission_only"], setup_note: "RSS-заказы." },
      { source: "freelance_ru", label: "Freelance.ru", kind: "marketplace", capabilities: ["read_public_projects", "generate_drafts", "manual_submission_only"], setup_note: "Открытые задания." }
    ]) });
  });
  await page.route("**/api/backend/integrations", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: 1, provider: "freelancehunt", status: "connected", label: "Freelancehunt" }]) });
  });
  await page.route("**/api/backend/sources", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedSources) });
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    submitted.push(payload);
    const item = { id: savedSources.length + 1, ...payload, status: "configured", created_at: "2026-10-18T10:00:00Z", last_scan_at: null, last_error: null, last_discovered_count: 0 };
    savedSources.push(item);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(item) });
  });

  await page.goto("/sources");
  const marketplaceAccordion = page.locator(".source-group-summary").filter({ hasText: "Фриланс-биржи" });
  await expect(marketplaceAccordion).toContainText("0 из 3 подключено");
  await marketplaceAccordion.click();
  const row = page.locator("article.sub-list-row").filter({ has: page.locator(".sub-list-main > strong").getByText("Freelancehunt", { exact: true }) });
  await expect(row).toContainText("API-токен подключён · поиск не включён");
  await row.getByRole("button", { name: "Подключить поиск" }).click();
  await expect(row).toContainText("Поиск подключён через официальный API");
  await expect(marketplaceAccordion).toContainText("1 из 3 подключено");
  expect(submitted).toEqual([{ source: "freelancehunt", identifier: "all", is_enabled: true }]);
});

test("projects search sends filters to the API and renders returned projects", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let lastQuery: string | null = null;
  await page.route("**/api/backend/projects**", async route => {
    const url = new URL(route.request().url());
    lastQuery = url.searchParams.get("q");
    const projects = lastQuery === "python" ? [{
      id: 12,
      source: "telegram",
      source_project_id: "tgram_jobs:12",
      url: "https://t.me/tgram_jobs/12",
      title: "Telegram bot lead collector",
      description: "Build a Python bot for collecting freelance leads.",
      language: "en",
      budget_min: 500,
      budget_max: 800,
      currency: "USD",
      payment_method: null,
      discovered_at: "2026-10-16T10:00:00Z",
      match_score: 85,
      match_reasons: ["Skill match: Python"]
    }] : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(projects) });
  });

  await page.goto("/projects");
  await page.getByLabel("Поиск заказов").fill("python");
  await page.getByRole("button", { name: /Применить/i }).click();
  await expect.poll(() => lastQuery).toBe("python");
  await expect(page.getByText("Telegram bot lead collector")).toBeVisible();
});

test("settings save action sits below the payment fields and persists preferences", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  const savedProfile: Record<string, unknown> = {
    display_name: "Dev",
    skills: ["Python"],
    languages: ["ru", "en"],
    min_budget: null,
    currency: "ALL",
    payment_preferences: [],
    excluded_keywords: []
  };
  await page.route("**/api/backend/profile", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedProfile) });
      return;
    }
    Object.assign(savedProfile, route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedProfile) });
  });

  await page.goto("/settings");
  await page.getByRole("button", { name: "Открыть аккаунт" }).click();
  await expect(page.getByText("Email", { exact: true })).toHaveCount(0);
  await expect(page.locator(".account-detail").filter({ hasText: "Способ входа" }).locator("strong")).toHaveText("Telegram");
  await page.getByRole("button", { name: "Открыть аккаунт" }).click();
  const paymentOptions = page.getByRole("group", { name: "Предпочтительные способы оплаты" });
  const saveButton = page.getByRole("button", { name: "Сохранить настройки" });
  await expect(paymentOptions).toBeVisible();
  await expect(saveButton).toBeVisible();
  const paymentBox = await paymentOptions.boundingBox();
  const saveBox = await saveButton.boundingBox();
  expect(paymentBox).not.toBeNull();
  expect(saveBox).not.toBeNull();
  expect(saveBox!.y).toBeGreaterThan(paymentBox!.y + paymentBox!.height);
  await page.getByLabel("Криптовалюта").check();
  await page.getByLabel("Валюта бюджета").selectOption("UAH");
  await page.getByLabel("Навыки и специализация").fill("Python, FastAPI");
  await saveButton.click();
  await expect(page.getByText(/Настройки сохранены/i)).toBeVisible();
  expect(savedProfile.skills).toEqual(["Python", "FastAPI"]);
  expect(savedProfile.payment_preferences).toEqual(["crypto"]);
  expect(savedProfile.currency).toBe("UAH");
});


test("dashboard shows the Telegram profile name without an email fallback", async ({ page, context }) => {
  await context.addCookies([{
    name: "fh_session",
    value: "playwright-session",
    url: "http://127.0.0.1:3000",
    httpOnly: true,
    sameSite: "Lax"
  }]);
  await mockAuthenticatedAccount(page);
  await page.route("**/api/backend/profile", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ display_name: "Dev", skills: ["Python"], languages: ["ru", "en"], payment_preferences: [], excluded_keywords: [], currency: "ALL" })
    });
  });
  await page.route("**/api/backend/dashboard/summary", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects_found: 0, matched_projects: 0, proposals_sent: 0, client_replies: 0 }) });
  });
  await page.route("**/api/backend/projects**", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/backend/sources", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /С возвращением/i })).toBeVisible();
  await expect(page.locator(".profile-text strong")).toHaveText("Dev");
  await expect(page.getByText("Email", { exact: true })).toHaveCount(0);
  await expect(page.locator(".profile-text")).toContainText("Telegram подключён");
});


test("expired session redirects a protected settings page to Telegram login", async ({ page }) => {
  await page.route("**/api/backend/auth/me", async route => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Authentication required." }) });
  });
  await page.route("**/api/backend/profile", async route => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Authentication required." }) });
  });
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /Продолжить через Telegram/ })).toBeVisible();
});

test("AI agent starts a first scan and application reply notifications persist", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let enabled = false;
  let notifyApplicationUpdates = true;
  let autoReply = false;
  await page.route("**/api/backend/agent/settings", async route => {
    if (route.request().method() === "PATCH") {
      const payload = route.request().postDataJSON() as { enabled?: boolean; notify_application_updates?: boolean; auto_reply?: boolean };
      if (payload.enabled !== undefined) enabled = payload.enabled;
      if (payload.notify_application_updates !== undefined) notifyApplicationUpdates = payload.notify_application_updates;
      if (payload.auto_reply !== undefined) autoReply = payload.auto_reply;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled, auto_draft: true, auto_submit: false, auto_reply: autoReply, daily_submission_limit: 10, notify_application_updates: notifyApplicationUpdates, telegram_linked: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled, auto_draft: true, auto_submit: false, auto_reply: autoReply, daily_submission_limit: 10, notify_application_updates: notifyApplicationUpdates, telegram_linked: true }) });
  });
  await page.route("**/api/backend/agent/scan", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scannedSources: 1, newProjects: 2, draftedApplications: 1, errors: [] }) });
  });

  await page.goto("/agent");
  const replyNotifications = page.getByRole("checkbox", { name: /Уведомлять об ответах на отклики в Telegram/i });
  await expect(replyNotifications).toBeChecked();
  await replyNotifications.click();
  await expect(replyNotifications).not.toBeChecked();
  await expect(page.getByText(/Уведомления об ответах на отклики отключены/i)).toBeVisible();
  expect(notifyApplicationUpdates).toBe(false);
  await page.getByRole("button", { name: "Включить агента" }).click();
  await expect(page.getByText(/Агент включён\. Первый проход завершён: новых проектов 2, подготовлено откликов 1/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Приостановить агента" })).toBeVisible();
  const autoReplies = page.locator("label").filter({ hasText: "Отвечать на новые сообщения Freelancehunt" }).locator("input");
  await expect(autoReplies).toBeEnabled();
  await autoReplies.click();
  await expect(autoReplies).toBeChecked();
  expect(autoReply).toBe(true);
});

test("AI agent settings stay neutral until the saved state has loaded", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let releaseSettings!: () => void;
  const settingsGate = new Promise<void>(resolve => { releaseSettings = resolve; });
  await page.route("**/api/backend/agent/settings", async route => {
    await settingsGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ enabled: true, auto_draft: true, auto_submit: true, daily_submission_limit: 50, notify_application_updates: true, telegram_linked: true })
    });
  });

  await page.goto("/agent");
  await expect(page.getByText("Загрузка состояния…")).toBeVisible();
  const autoSubmit = page.locator("label").filter({ hasText: "Автоматически отправлять отклики" }).locator("input");
  const dailyLimit = page.locator("select");
  await expect(autoSubmit).not.toBeChecked();
  await expect(autoSubmit).toBeDisabled();
  await expect(dailyLimit).toHaveValue("");
  await expect(dailyLimit).toBeDisabled();

  releaseSettings();
  await expect(page.getByText("Включён", { exact: true })).toBeVisible();
  await expect(autoSubmit).toBeChecked();
  await expect(dailyLimit).toHaveValue("50");
});
test("integrations page offers only the verified Freelancehunt connection", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  await page.route("**/api/backend/integrations/catalog", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { provider: "freelancehunt", label: "Freelancehunt", status: "pending", setup_note: "Вставь API-токен Freelancehunt." }
      ])
    });
  });
  await page.route("**/api/backend/integrations", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/integrations");
  await expect(page.getByRole("heading", { name: "Биржи фриланса" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Получить API-токен/ })).toHaveAttribute("href", "https://freelancehunt.com/my/api");
  await expect(page.getByText(/Создай API-ключ на этой странице и скопируй его\./)).toBeVisible();
  await expect(page.getByLabel("API-токен Freelancehunt")).toBeVisible();
  await expect(page.getByRole("button", { name: /Подключить|Добавить в список/ })).toHaveCount(0);
  await expect(page.getByText(/Интеграция в разработке|адаптер ожидается/i)).toHaveCount(0);
});

test("security page logs out and returns to Telegram login", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let logoutCalled = false;
  await page.route("**/api/backend/agent/settings", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: false, telegram_linked: false }) });
  });
  await page.route("**/api/backend/auth/logout", async route => {
    logoutCalled = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/security");
  await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(logoutCalled).toBe(true);
});


test("Telegram proposal drafts can be edited and copied without implying automatic sending", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockAuthenticatedAccount(page);
  const application: Record<string, unknown> = {
    id: 42,
    project_id: 12,
    status: "draft",
    draft_text: "Hello, I can help with this project.",
    created_at: "2026-10-17T09:00:00Z",
    submitted_at: null,
    replied_at: null,
    project: { title: "Telegram bot lead collector", url: "https://t.me/job_for_bots/42", source: "telegram" }
  };
  await page.route("**/api/backend/applications**", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([application]) });
      return;
    }
    Object.assign(application, route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(application) });
  });

  await page.goto("/applications");
  const editor = page.getByLabel("Текст отклика");
  await editor.fill("Hello, I can build the requested bot using the skills in my profile.");
  await page.getByRole("button", { name: "Сохранить текст" }).click();
  await expect(page.getByText("Черновик сохранён.")).toBeVisible();
  await expect(page.getByText(/Для Telegram, FL\.ru и Freelance\.ru скопируй текст и отправь его вручную/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Подготовить к подтверждению" })).toHaveCount(0);
  await page.getByRole("button", { name: "Скопировать текст" }).click();
  await expect(page.getByText(/Текст отклика скопирован/i)).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Hello, I can build the requested bot using the skills in my profile.");
  expect(application.status).toBe("draft");
  expect(application.draft_text).toContain("skills in my profile");
  expect(application.status).not.toBe("sent");
});


test("Freelancehunt integration accepts an API token but never displays it after saving", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let stored: Record<string, unknown> | null = null;
  await page.route("**/api/backend/integrations/catalog", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { provider: "freelancehunt", label: "Freelancehunt", status: "pending", setup_note: "Use the official API token." }
    ]) });
  });
  await page.route("**/api/backend/integrations", async route => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as { provider: string; secret: string };
      expect(payload.provider).toBe("freelancehunt");
      expect(payload.secret).toBe("test-api-token");
      stored = { id: 1, provider: "freelancehunt", label: "Freelancehunt · test_user", status: "connected", created_at: "2026-10-17T10:00:00Z" };
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(stored) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored ? [stored] : []) });
  });

  await page.goto("/integrations");
  await page.getByLabel("API-токен Freelancehunt").fill("test-api-token");
  await page.getByRole("button", { name: "Проверить и подключить" }).click();
  await expect(page.getByText(/API-токен проверен и сохранён в зашифрованном виде/i)).toBeVisible();
  await expect(page.getByText("Подключено")).toBeVisible();
  await expect(page.getByLabel("API-токен Freelancehunt")).toHaveValue("");
});



test("integrations page runs Freelancehunt bid status sync", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  await page.route("**/api/backend/integrations/catalog", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { provider: "freelancehunt", label: "Freelancehunt", status: "available", setup_note: "Official API integration." }
    ]) });
  });
  await page.route("**/api/backend/integrations", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([
      { id: 3, provider: "freelancehunt", label: "Freelancehunt · test-user", status: "connected", created_at: "2026-10-17T10:00:00Z" }
    ]) });
  });
  let syncCalled = false;
  await page.route("**/api/backend/integrations/freelancehunt/sync", async route => {
    syncCalled = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ checked: 2, updated: 1, errors: 0 }) });
  });

  await page.goto("/integrations");
  await expect(page.getByRole("button", { name: "Синхронизировать отклики" })).toBeVisible();
  await page.getByRole("button", { name: "Синхронизировать отклики" }).click();
  await expect.poll(() => syncCalled).toBe(true);
  await expect(page.getByText("Проверено откликов: 2. Обновлено ответов заказчиков: 1. Ошибок: 0.")).toBeVisible();
});


test("core workspace pages fit a phone viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/backend/**", async route => {
    const pathname = new URL(route.request().url()).pathname.replace("/api/backend", "");
    let body: unknown = [];
    if (pathname === "/profile") {
      body = { display_name: "Test user", skills: [], languages: ["ru", "en"], payment_preferences: [], excluded_keywords: [], min_budget: null, currency: "RUB" };
    } else if (pathname === "/agent/settings") {
      body = { enabled: false, is_enabled: false, auto_draft: true, notify_new_projects: true, notify_application_updates: true, min_match_score: 60, telegram_linked: true };
    } else if (pathname === "/agent/readiness") {
      body = { worker_runtime: true, cron_configured: true, telegram_bot_configured: true, ai_provider_configured: false, marketplace_adapters: ["freelancehunt"] };
    } else if (pathname === "/integrations/catalog") {
      body = [{ provider: "freelancehunt", label: "Freelancehunt", status: "available", setup_note: "Official API" }];
    } else if (pathname === "/integrations") {
      body = [{ id: 1, provider: "freelancehunt", label: "Freelancehunt", status: "connected", created_at: "2026-10-17T10:00:00Z" }];
    } else if (pathname === "/sources/catalog") {
      body = [];
    } else if (pathname === "/dashboard/summary") {
      body = { projects_found: 0, matched_projects: 0, proposals_sent: 0, client_replies: 0 };
    } else if (pathname === "/analytics") {
      body = { projects_found: 0, matched_projects: 0, proposals_sent: 0, client_replies: 0, source_stats: [] };
    } else if (pathname === "/agent/scan") {
      body = { scannedSources: 0, newProjects: 0, errors: [] };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await mockAuthenticatedAccount(page);

  for (const path of ["/integrations", "/agent", "/applications", "/sources"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(100);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    expect(dimensions.document, path + " should not overflow horizontally").toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});
