import { expect, test } from "@playwright/test";

test("login molecule spins smoothly and supports pointer rotation", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/login");

  const interaction = page.getByRole("img", { name: /Трёхмерная молекула/ });
  const canvas = page.locator(".auth-molecule-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS("animation-name", "molecule-spin");

  const initialSize = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
  const box = await interaction.boundingBox();
  if (!box) throw new Error("Molecule interaction region is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 50);
  await expect(interaction).toHaveCSS("--molecule-rotate-y", "32deg");
  await page.mouse.up();
  await expect(interaction).toHaveCSS("--molecule-rotate-y", "32deg");

  await expect.poll(() => canvas.evaluate(element => ({ width: element.width, height: element.height }))).toEqual(initialSize);
});

test("login molecule respects reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");

  await expect(page.locator(".auth-molecule-canvas")).toHaveCSS("animation-name", "none");
});
