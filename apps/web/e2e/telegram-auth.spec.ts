import { expect, test } from "@playwright/test";

for (const path of ["/login", "/register"]) {
  test(`${path} uses Telegram only and has no email/password form`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: path === "/login" ? "Войди в аккаунт" : "Создай аккаунт" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Продолжить через Telegram/ })).toBeVisible();
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/email и пароль не нужны|Почта и пароль не нужны/i)).toBeVisible();
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
