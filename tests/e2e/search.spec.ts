import { expect, test } from "@playwright/test";
import { setupPosition } from "./helpers";

test.describe("Search", () => {
	test("opens search on / key and finds Sirius", async ({ page }) => {
		await setupPosition(page);

		await page.keyboard.press("/");

		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.waitFor({ state: "visible" });

		await searchInput.fill("Sirius");

		const searchResults = page.locator('[data-testid="search-results"]');
		await expect(searchResults).toBeVisible({ timeout: 10000 });

		const firstResult = page.locator('[data-testid="search-result"]').first();
		await expect(firstResult).toBeVisible();
	});
});
