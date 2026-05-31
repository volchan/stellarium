import { test, expect } from "@playwright/test";
import { setupPosition } from "./helpers";

test.describe("Settings panel", () => {
  test("opens settings panel on S key", async ({ page }) => {
    await setupPosition(page);

    await page.locator("body").press("s");

    const settingsPanel = page.locator('[data-testid="settings-panel"]');
    await expect(settingsPanel).toHaveClass(/open/, { timeout: 5000 });
  });

  test("closes settings panel on Escape", async ({ page }) => {
    await setupPosition(page);

    await page.locator("body").press("s");

    const settingsPanel = page.locator('[data-testid="settings-panel"]');
    await expect(settingsPanel).toHaveClass(/open/, { timeout: 5000 });

    await page.keyboard.press("Escape");

    await expect(settingsPanel).not.toHaveClass(/open/, { timeout: 5000 });
  });
});
