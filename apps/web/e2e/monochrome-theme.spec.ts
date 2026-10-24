import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectNeutralSurface(locator: Locator) {
  await expect(locator).toBeVisible();
  const styles = await locator.evaluate(element => {
    const computed = window.getComputedStyle(element);
    return [
      computed.backgroundColor,
      computed.backgroundImage,
      computed.color,
      computed.borderTopColor
    ].join(" ");
  });
  const channels = [...styles.matchAll(/rgba?\(\s*(\d+)[,\s]+\s*(\d+)[,\s]+\s*(\d+)/g)];
  expect(channels.length, "Expected browser-computed colors to be inspectable").toBeGreaterThan(0);
  for (const color of channels) {
    const rgb = color.slice(1, 4).map(Number);
    expect(Math.max(...rgb) - Math.min(...rgb), "Unexpected saturated color: " + color[0]).toBeLessThanOrEqual(2);
  }
}

async function mockUser(page: Page) {
  await page.route("**/api/backend/auth/me", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ identity_provider: "telegram", telegram_user_id: "12345" })
    })
  );
}

test("registration and login share rounded monochrome authentication design", async ({ page }) => {
  for (const path of ["/login", "/register"]) {
    await page.goto(path);
    await expect(page.locator(".auth-brand")).toContainText("Pipisso ByteCraft");
    await expect(page.locator(".auth-card")).toHaveCSS("border-top-left-radius", "24px");
    await expect(page.locator(".auth-submit")).toHaveCSS("border-top-left-radius", "12px");
    await expectNeutralSurface(page.locator(".auth-card"));
    await expectNeutralSurface(page.locator(".auth-submit"));
    await expectNeutralSurface(page.locator(".auth-brand .brand-mark"));
  }
});

test("project workspace reuses monochrome cards, controls and sidebar", async ({ page }) => {
  await mockUser(page);
  await page.route("**/api/backend/projects**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.goto("/projects");
  await expect(page.locator(".sub-sidebar .brand")).toContainText("Pipisso ByteCraft");
  await expectNeutralSurface(page.locator(".sub-sidebar"));
  await expectNeutralSurface(page.locator(".content-card").first());
  await expect(page.locator(".content-card").first()).toHaveCSS("border-top-left-radius", "18px");
});

test("dashboard charts and status indicators do not reintroduce purple", async ({ page }) => {
  await page.context().addCookies([{ name: "fh_session", value: "mock-session", url: "http://127.0.0.1:3000" }]);
  await mockUser(page);
  const mockData: Record<string, unknown> = {
    "dashboard/summary": {
      projects_found: 3, matched_projects: 2, proposals_sent: 1, client_replies: 0,
      telegram_channels_connected: 1, marketplaces_connected: 0, marketplace_sources_enabled: 0,
      marketplace_public_sources_connected: 0, telegram_bots_connected: 0, agent_enabled: 1,
      daily_activity: [
        { day: "2026-10-19", projects_found: 1 },
        { day: "2026-10-20", projects_found: 2 }
      ]
    },
    "projects?limit=5": [],
    "sources": [],
    "profile": { display_name: "Тест" }
  };
  for (const [endpoint, body] of Object.entries(mockData)) {
    await page.route("**/api/backend/" + endpoint, route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
    );
  }

  await page.goto("/dashboard");
  await expect(page.locator(".sidebar .brand")).toContainText("Pipisso ByteCraft");
  await expect(page.locator(".metric-card").first()).toContainText("3");
  await expectNeutralSurface(page.locator(".sidebar"));
  await expectNeutralSurface(page.locator(".metric-card").first());
  await expectNeutralSurface(page.locator(".agent-panel .status-pill"));
  await expectNeutralSurface(page.locator(".activity-chart-column span").first());
  await expect(page.locator(".metric-card").first()).toHaveCSS("border-top-left-radius", "18px");
});
