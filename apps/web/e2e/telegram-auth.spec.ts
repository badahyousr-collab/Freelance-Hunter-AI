import { expect, test } from "@playwright/test";

for (const path of ["/login", "/register"]) {
  test(`${path} uses Telegram only and has no email/password form`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: path === "/login" ? "Войди в аккаунт" : "Создай аккаунт" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Продолжить через Telegram/ })).toBeVisible();
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(path === "/register" ? /Почта и пароль не нужны/i : /Вход через Telegram/i)).toBeVisible();
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

  await page.goto("/sources");
  const channel = page.locator(".sub-list-row").filter({ hasText: "Telegram jobs" });
  await expect(channel.getByRole("button", { name: "Добавить" })).toBeVisible();
  await channel.getByRole("button", { name: "Добавить" }).click();
  await expect(page.getByText(/Канал @tgram_jobs добавлен/i)).toBeVisible();
  await expect(page.locator(".sub-list-row").filter({ hasText: "@tgram_jobs" }).getByText(/Добавлен|Включён/).first()).toBeVisible();
});


test("projects search sends filters to the API and renders returned projects", async ({ page }) => {
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
