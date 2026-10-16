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
  await expect(page.getByText(/Код действует 10 минут/i)).toBeVisible();
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
