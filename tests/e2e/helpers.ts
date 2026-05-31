import { type Page } from "@playwright/test";

export async function setupPosition(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('[data-testid="position-form"]').waitFor({ state: "visible" });
  await page.fill("#inp-lat", "48.8566");
  await page.fill("#inp-lon", "2.3522");
  await page.click('[data-testid="position-submit"]');
  await page.locator('[data-testid="sky-canvas"]').waitFor({ state: "visible" });
}
