import { expect, test, type Page } from "@playwright/test";

async function canvasFrame(page: Page) {
  return page.locator(".auth-molecule-canvas").evaluate(element =>
    (element as HTMLCanvasElement).toDataURL("image/png")
  );
}

test("login molecule continuously reprojects its 3D geometry and supports pointer rotation", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/login");

  const interaction = page.getByRole("img", { name: /Трёхмерная молекула/ });
  const canvas = page.locator(".auth-molecule-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS("animation-name", "none");
  await expect(page.locator(".auth-brand")).toContainText("Pipisso ByteCraft");

  const getCanvasSize = () => canvas.evaluate(element => {
    const c = element as HTMLCanvasElement;
    return { width: c.width, height: c.height };
  });
  await expect.poll(async () => (await getCanvasSize()).width).toBeGreaterThan(0);
  const initialSize = await getCanvasSize();

  // CSS rotation of a frozen 2D snapshot would leave the backing image unchanged.
  await page.waitForTimeout(150);
  const firstFrame = await canvasFrame(page);
  await expect.poll(() => canvasFrame(page), { timeout: 5000 }).not.toBe(firstFrame);

  const box = await interaction.boundingBox();
  if (!box) throw new Error("Molecule interaction region is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const beforeDrag = await canvasFrame(page);
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 50, { steps: 4 });
  await expect.poll(() => canvasFrame(page)).not.toBe(beforeDrag);
  await page.mouse.up();

  await expect.poll(getCanvasSize).toEqual(initialSize);
});

test("login molecule stops autospin for reduced motion but remains draggable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");

  const canvas = page.locator(".auth-molecule-canvas");
  const interaction = page.getByRole("img", { name: /Трёхмерная молекула/ });
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS("animation-name", "none");
  await page.waitForTimeout(200);
  const before = await canvasFrame(page);
  await page.waitForTimeout(300);
  expect(await canvasFrame(page)).toBe(before);

  const box = await interaction.boundingBox();
  if (!box) throw new Error("Molecule interaction region is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30);
  await page.mouse.up();
  expect(await canvasFrame(page)).not.toBe(before);
});
