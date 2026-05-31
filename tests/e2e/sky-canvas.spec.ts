import { test, expect } from "@playwright/test";
import { setupPosition } from "./helpers";

test.describe("SkyCanvas", () => {
  test("canvas is present with non-zero dimensions", async ({ page }) => {
    await setupPosition(page);

    const canvas = page.locator('[data-testid="sky-canvas"]');
    await expect(canvas).toBeAttached();

    const dimensions = await canvas.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      return {
        width: canvas.offsetWidth || canvas.width,
        height: canvas.offsetHeight || canvas.height,
      };
    });

    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
  });
});
