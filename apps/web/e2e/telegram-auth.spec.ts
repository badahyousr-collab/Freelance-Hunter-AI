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

  await page.goto("/sources");
  const channel = page.locator(".sub-list-row").filter({ hasText: "Вакансии для разработчиков ботов" });
  await expect(channel.getByRole("button", { name: "Добавить" })).toBeVisible();
  await channel.getByRole("button", { name: "Добавить" }).click();
  await expect(page.getByText(/Канал @job_for_bots добавлен/i)).toBeVisible();
  await expect(page.locator(".sub-list-row").filter({ hasText: "@job_for_bots" }).getByText(/Добавлен|Включён/).first()).toBeVisible();
  await page.getByRole("button", { name: /Сканировать сейчас/i }).click();
  await expect(page.getByText(/Источников: 1, новых проектов: 3/i)).toBeVisible();
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
  await page.getByLabel("Search projects").fill("python");
  await page.getByRole("button", { name: /Apply filters/i }).click();
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
  const paymentInput = page.getByLabel("Способы выплат");
  const saveButton = page.getByRole("button", { name: "Сохранить настройки" });
  await expect(paymentInput).toBeVisible();
  await expect(saveButton).toBeVisible();
  const paymentBox = await paymentInput.boundingBox();
  const saveBox = await saveButton.boundingBox();
  expect(paymentBox).not.toBeNull();
  expect(saveBox).not.toBeNull();
  expect(saveBox!.y).toBeGreaterThan(paymentBox!.y + paymentBox!.height);
  await page.getByLabel("Skills (comma-separated)").fill("Python, FastAPI");
  await saveButton.click();
  await expect(page.getByText(/Настройки сохранены/i)).toBeVisible();
  expect(savedProfile.skills).toEqual(["Python", "FastAPI"]);
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
  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
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

test("AI agent toggle and manual scan call the API and show results", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let enabled = false;
  let notifyNewProjects = true;
  await page.route("**/api/backend/profile", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ display_name: "Dev", skills: ["Python"], languages: ["ru", "en"], payment_preferences: [], excluded_keywords: [], min_budget: null, currency: "ALL" }) });
  });
  await page.route("**/api/backend/sources", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: 1, source: "telegram", identifier: "@job_for_bots", is_enabled: true, status: "active", last_scan_at: null, last_discovered_count: 0 }]) });
  });
  await page.route("**/api/backend/agent/settings", async route => {
    if (route.request().method() === "PATCH") {
      const payload = route.request().postDataJSON() as { enabled?: boolean; notify_new_projects?: boolean };
      if (payload.enabled !== undefined) enabled = payload.enabled;
      if (payload.notify_new_projects !== undefined) notifyNewProjects = payload.notify_new_projects;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled, notify_new_projects: notifyNewProjects, telegram_linked: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled, notify_new_projects: notifyNewProjects, telegram_linked: true }) });
  });
  await page.route("**/api/backend/agent/readiness", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ worker_runtime: true, cron_configured: true, telegram_bot_configured: true, ai_provider_configured: false, marketplace_adapters: [] }) });
  });
  await page.route("**/api/backend/agent/scan", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scannedSources: 1, newProjects: 2, errors: [] }) });
  });

  await page.goto("/agent");
  const notifications = page.getByRole("checkbox", { name: /Уведомлять о новых заказах в Telegram/i });
  await expect(notifications).toBeChecked();
  await notifications.click();
  await expect(notifications).not.toBeChecked();
  await expect(page.getByText(/Уведомления о новых проектах отключены/i)).toBeVisible();
  expect(notifyNewProjects).toBe(false);
  await page.getByRole("button", { name: "Включить агента" }).click();
  await expect(page.getByText(/AI-агент включён/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Приостановить агента" })).toBeVisible();
  await page.getByRole("button", { name: "Сканировать Telegram-каналы" }).click();
  await expect(page.getByText(/новых проектов 2, источников 1/i)).toBeVisible();
});

test("integrations page does not ask for marketplace passwords or pretend to connect accounts", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  await page.route("**/api/backend/integrations/catalog", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { provider: "upwork", label: "Upwork", status: "pending", setup_note: "OAuth adapter is not ready." },
        { provider: "kwork", label: "Kwork", status: "pending", setup_note: "Adapter is not ready." }
      ])
    });
  });
  await page.route("**/api/backend/integrations", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/integrations");
  await expect(page.getByRole("heading", { name: "Биржи фриланса" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Открыть биржу/ })).toHaveCount(2);
  await expect(page.locator('input[type="password"], input[name="secret"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Подключить|Добавить в список/ })).toHaveCount(0);
  await expect(page.getByText(/Интеграция в разработке/).first()).toBeVisible();
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


test("proposal draft can be edited and prepared for confirmation without claiming it was sent", async ({ page }) => {
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
  await page.getByRole("button", { name: "Подготовить к подтверждению" }).click();
  await expect(page.getByText("Черновик подготовлен к подтверждению. Отправка не выполнялась.")).toBeVisible();
  await expect(page.getByText("Готов к подтверждению")).toBeVisible();
  expect(application.status).toBe("awaiting_confirmation");
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

test("Freelancehunt submission requires a visible confirmation and provider success", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let submitPayload: Record<string, unknown> | null = null;
  await page.route("**/api/backend/applications**", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
        id: 43, project_id: 299172, status: "awaiting_confirmation", draft_text: "I can build this bot.",
        created_at: "2026-10-17T10:00:00Z", submitted_at: null, replied_at: null,
        project: { title: "Python Telegram bot", url: "https://freelancehunt.com/project/python-telegram-bot/299172.html", source: "freelancehunt", budget_max: 5000, currency: "RUB" }
      }]) });
      return;
    }
    if (route.request().method() === "POST" && route.request().url().endsWith("/applications/43/submit")) {
      submitPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        id: 43, project_id: 299172, status: "sent", draft_text: "I can build this bot.",
        created_at: "2026-10-17T10:00:00Z", submitted_at: "2026-10-17T10:30:00Z",
        provider_submission_id: "3119168", submission_error: null
      }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
  page.on("dialog", dialog => dialog.accept());

  await page.goto("/applications");
  await page.getByLabel("Сумма отклика (UAH или RUB)").fill("4500");
  await page.getByLabel("Срок выполнения, дней").fill("5");
  await page.getByRole("button", { name: /Подтвердить и отправить через Freelancehunt/ }).click();
  await expect(page.getByText("Freelancehunt подтвердил отправку отклика.")).toBeVisible();
  await expect(page.getByText("Отправлен площадкой")).toBeVisible();
  expect(submitPayload).toEqual({ budget_amount: 4500, currency: "RUB", days: 5, safe_type: "employer" });
});
