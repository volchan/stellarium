import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { useUiStore } from "@/stores/ui";
import { useTelemetryStore } from "@/stores/telemetry";
import SearchBar from "./SearchBar.vue";

// loadStars() fetches /data/stars.json which is unavailable in Storybook.
// The component handles this gracefully: allStars stays [] so catalog results
// are always empty. Sun, Moon and planets still match because they are
// computed inline without the catalog.

const meta = {
	title: "Components/SearchBar",
	component: SearchBar,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(story) => {
			// Ensure the overlay is visible for every story
			const ui = useUiStore();
			ui.searchOpen = true;
			return story();
		},
	],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Default — panel open, empty query → hint text visible
// ---------------------------------------------------------------------------
export const Default: Story = {
	play: async ({ canvas }) => {
		const input = canvas.getByTestId("search-input");
		await expect(input).toBeVisible();

		const hint = canvas.getByText("Type at least 2 characters");
		await expect(hint).toBeVisible();
	},
};

// ---------------------------------------------------------------------------
// SingleChar — one character typed → hint still shown (< 2 chars threshold)
// ---------------------------------------------------------------------------
export const SingleChar: Story = {
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByTestId("search-input");
		await userEvent.type(input, "S");

		const hint = canvas.getByText("Type at least 2 characters");
		await expect(hint).toBeVisible();

		// No results list yet
		const results = canvas.queryByTestId("search-results");
		await expect(results).toBeNull();
	},
};

// ---------------------------------------------------------------------------
// WithQuery — catalog is empty so "No results" appears; UI flow is exercised
// ---------------------------------------------------------------------------
export const WithQuery: Story = {
	play: async ({ canvas, userEvent, step }) => {
		await step("Type a query", async () => {
			const input = canvas.getByTestId("search-input");
			// "xz" matches no solar-system body and no real star name, so it
			// reliably returns "No results" whether or not the catalog is loaded.
			await userEvent.type(input, "xz");
		});

		await step("Expect empty-state feedback", async () => {
			const empty = canvas.getByText("No results");
			await expect(empty).toBeVisible();
		});
	},
};

// ---------------------------------------------------------------------------
// PlanetMatch — "su" matches "Sun"; planet results are computed without catalog
// ---------------------------------------------------------------------------
export const PlanetMatch: Story = {
	decorators: [
		(story) => {
			// Pin telemetry to a known time so planet computation is deterministic
			const telemetry = useTelemetryStore();
			telemetry.zuluTime = 1748649600; // 2025-05-31T00:00:00Z
			telemetry.lat = 48.8566;
			telemetry.lon = 2.3522;
			return story();
		},
	],
	play: async ({ canvas, userEvent, step }) => {
		await step("Type 'su' to match Sun", async () => {
			const input = canvas.getByTestId("search-input");
			await userEvent.type(input, "su");
		});

		await step("Results list is visible with at least one entry", async () => {
			const results = await canvas.findByTestId("search-results");
			await expect(results).toBeVisible();

			const items = canvas.getAllByTestId("search-result");
			await expect(items.length).toBeGreaterThan(0);

			// Sun should appear
			const sunLabel = canvas.getByText("Sun");
			await expect(sunLabel).toBeVisible();
		});
	},
};

// ---------------------------------------------------------------------------
// MoonMatch — "mo" matches Moon
// ---------------------------------------------------------------------------
export const MoonMatch: Story = {
	play: async ({ canvas, userEvent, step }) => {
		await step("Type 'mo' to match Moon", async () => {
			const input = canvas.getByTestId("search-input");
			await userEvent.type(input, "mo");
		});

		await step("Moon result is listed", async () => {
			const results = await canvas.findByTestId("search-results");
			await expect(results).toBeVisible();

			const moonLabel = canvas.getByText("Moon");
			await expect(moonLabel).toBeVisible();
		});
	},
};

// ---------------------------------------------------------------------------
// KeyboardNavigation — ArrowDown moves the active highlight
// ---------------------------------------------------------------------------
export const KeyboardNavigation: Story = {
	play: async ({ canvas, userEvent, step }) => {
		await step("Type 'un' to get results (matches Sun + Neptune without catalog)", async () => {
			const input = canvas.getByTestId("search-input");
			await userEvent.type(input, "un");
			await canvas.findByTestId("search-results");
		});

		await step("Arrow down highlights next item", async () => {
			await userEvent.keyboard("{ArrowDown}");

			const items = canvas.getAllByTestId("search-result");
			// activeIdx starts at 0; one ArrowDown moves it to 1
			await expect(items[1]).toHaveClass("active");
		});

		await step("Arrow up returns to first item", async () => {
			await userEvent.keyboard("{ArrowUp}");

			const items = canvas.getAllByTestId("search-result");
			await expect(items[0]).toHaveClass("active");
		});
	},
};

// ---------------------------------------------------------------------------
// CloseOnEsc — pressing Escape clears the overlay (searchOpen → false)
// ---------------------------------------------------------------------------
export const CloseOnEsc: Story = {
	play: async ({ canvas, userEvent, step }) => {
		await step("Overlay is initially visible", async () => {
			const input = canvas.getByTestId("search-input");
			await expect(input).toBeVisible();
		});

		await step("Press Escape", async () => {
			await userEvent.keyboard("{Escape}");
		});

		await step("searchOpen is now false", async () => {
			const ui = useUiStore();
			await expect(ui.searchOpen).toBe(false);
		});
	},
};

// ---------------------------------------------------------------------------
// EscButton — clicking the Esc badge closes the panel
// ---------------------------------------------------------------------------
export const EscButton: Story = {
	play: async ({ canvas, userEvent, step }) => {
		await step("Click the Esc badge", async () => {
			const escBadge = canvas.getByText("Esc");
			await userEvent.click(escBadge);
		});

		await step("searchOpen is now false", async () => {
			const ui = useUiStore();
			await expect(ui.searchOpen).toBe(false);
		});
	},
};
