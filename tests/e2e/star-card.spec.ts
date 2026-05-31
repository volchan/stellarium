import { expect, test } from "@playwright/test";
import { setupPosition } from "./helpers";

test.describe("Star card detail panel", () => {
	test("shows star card after selecting a star via search", async ({ page }) => {
		await setupPosition(page);

		await page.keyboard.press("/");

		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.waitFor({ state: "visible" });
		await searchInput.fill("Sirius");

		await page.locator('[data-testid="search-results"]').waitFor({ state: "visible", timeout: 10000 });

		await page.locator('[data-testid="search-result"]').first().click();

		await expect(page.locator('[data-testid="star-card"]')).toHaveClass(/visible/);
		await expect(page.locator('[data-testid="star-name"]')).toContainText("Sirius");
	});
});
