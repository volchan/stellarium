import { test, expect } from "@playwright/test";

test.describe("Position setup flow", () => {
  test("shows position form on load", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="position-form"]')).toBeVisible();
  });

  test("submits position and shows sky canvas", async ({ page }) => {
    await page.goto("/");
    await page.fill("#inp-lat-deg", "48.8566");
    await page.fill("#inp-lon-deg", "2.3522");
    await page.click('[data-testid="position-submit"]');
    await expect(page.locator('[data-testid="sky-canvas"]')).toBeVisible();
  });
});
