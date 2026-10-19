import { expect, test, type Page } from "@playwright/test";

async function mockAuthenticatedAccount(page: Page) {
  await page.route("**/api/backend/auth/me", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        identity_provider: "telegram",
        created_at: "2026-10-16T10:00:00Z",
        telegram_user_id: "12345",
        telegram_linked_at: "2026-10-16T10:00:00Z"
      })
    });
  });
}

test("projects empty state explains the next action and links to source setup", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  await page.route("**/api/backend/projects**", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/projects");

  await expect(page.getByRole("heading", { name: "Найденные заказы" })).toBeVisible();
  await expect(page.getByText("Подходящих заказов пока нет")).toBeVisible();
  await expect(page.getByRole("link", { name: "Подключить источники" })).toHaveAttribute("href", "/sources");
  await expect(page.getByText(/публикации не старше 72 часов/i)).toBeVisible();
});

test("projects page keeps the search controls usable after an API error and shows a recoverable message", async ({ page }) => {
  await mockAuthenticatedAccount(page);
  let requestCount = 0;
  await page.route("**/api/backend/projects**", async route => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ detail: "API temporarily unavailable." })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/projects");
  await expect(page.getByText("API temporarily unavailable.")).toBeVisible();
  await page.getByLabel("Поиск заказов").fill("Telegram bot");
  await page.getByRole("button", { name: /Применить/i }).click();
  await expect(page.getByText("Подходящих заказов пока нет")).toBeVisible();
  expect(requestCount).toBeGreaterThanOrEqual(2);
});
