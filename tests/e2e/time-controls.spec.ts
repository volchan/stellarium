import { test, expect } from "@playwright/test";
import { setupPosition } from "./helpers";

test.describe("time controls", () => {
  test("time controls are visible after position setup", async ({ page }) => {
    await setupPosition(page);
    await expect(page.getByTitle("+1 hour")).toBeVisible();
  });

  test("step forward 1 hour changes the clock display", async ({ page }) => {
    await setupPosition(page);
    await page.locator('[data-testid="clock-display"]').waitFor({ state: "visible" });
    const before = await page.locator('[data-testid="clock-display"]').textContent();
    await page.getByTitle("+1 hour").click();
    await page.waitForTimeout(300);
    const after = await page.locator('[data-testid="clock-display"]').textContent();
    expect(before).not.toBe(after);
  });
});
