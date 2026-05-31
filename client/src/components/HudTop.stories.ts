import type { Meta, StoryObj } from "@storybook/vue3";
import { expect, fn } from "storybook/test";
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import HudTop from "./HudTop.vue";

const meta = {
	component: HudTop,
	title: "Components/HudTop",
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		clockDisplay: {
			control: "text",
			description: "Formatted time string rendered inside the clock widget.",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: '"22:14:05"' },
				category: "Props",
			},
		},
		clockLabel: {
			control: "text",
			description: "Secondary label rendered next to the clock (e.g. timezone name).",
			table: {
				type: { summary: "string" },
				defaultValue: { summary: '"UTC"' },
				category: "Props",
			},
		},
		onOpenForm: {
			action: "openForm",
			table: { category: "Events" },
		},
	},
	args: {
		clockDisplay: "22:14:05",
		clockLabel: "UTC",
		onOpenForm: fn(),
	},
} satisfies Meta<typeof HudTop>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * No observer position has been set yet. The HUD shows only the brand,
 * the "Set position" button and hides the clock / data widgets.
 */
export const NoPosition: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.coordsSet = false;
			return story();
		},
	],
	play: async ({ canvas, userEvent, args }) => {
		const btn = canvas.getByRole("button", { name: "Set position" });
		await expect(btn).toBeVisible();

		// Clock widget must be absent
		const clock = canvas.queryByTestId("clock-display");
		await expect(clock).toBeNull();

		await userEvent.click(btn);
		await expect(args.onOpenForm).toHaveBeenCalledTimes(1);
	},
};

/**
 * Observer position is known. The clock widget, heading, lat/lon and
 * altitude data are all visible alongside the "Change position" button.
 */
export const WithPosition: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			const telemetry = useTelemetryStore();

			ui.coordsSet = true;
			ui.camera.az = 247;

			telemetry.lat = 48.8566;
			telemetry.lon = 2.3522;
			telemetry.alt = 3500;
			telemetry.timeOffset = 0;
			telemetry.timeSpeed = 1;

			return story();
		},
	],
	args: {
		clockDisplay: "22:14:05",
		clockLabel: "UTC",
	},
	play: async ({ canvas, userEvent, args }) => {
		// Clock widget must be present and show the correct time
		const clock = canvas.getByTestId("clock-display");
		await expect(clock).toBeVisible();
		await expect(clock).toHaveTextContent("22:14:05");

		// "Change position" button triggers openForm
		const changeBtn = canvas.getByRole("button", { name: "Change position" });
		await expect(changeBtn).toBeVisible();
		await userEvent.click(changeBtn);
		await expect(args.onOpenForm).toHaveBeenCalledTimes(1);

		// Search button is visible
		const searchBtn = canvas.getByTitle("Search (/ or F)");
		await expect(searchBtn).toBeVisible();

		// Settings button is visible
		const settingsBtn = canvas.getByTitle("Settings");
		await expect(settingsBtn).toBeVisible();
	},
};

/**
 * timeOffset is set to +7200 s (2 hours ahead of live). The clock widget
 * should render with the warm offset colour class and show "+2h" as label.
 */
export const OffsetClock: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			const telemetry = useTelemetryStore();

			ui.coordsSet = true;
			ui.camera.az = 90;

			telemetry.lat = 51.5074;
			telemetry.lon = -0.1278;
			telemetry.alt = 0;
			telemetry.timeOffset = 7200; // +2 h
			telemetry.timeSpeed = 1;

			return story();
		},
	],
	args: {
		clockDisplay: "00:14:05",
		clockLabel: "UTC",
	},
	play: async ({ canvas, userEvent, args }) => {
		const clock = canvas.getByTestId("clock-display");
		await expect(clock).toBeVisible();
		await expect(clock).toHaveTextContent("00:14:05");

		// The clock element should carry the offset modifier class
		// (closest parent with the hud-clock class)
		const clockWrap = clock.closest(".hud-clock");
		await expect(clockWrap).toHaveClass("clock-offset");

		// "Change position" button still emits openForm
		const changeBtn = canvas.getByRole("button", { name: "Change position" });
		await userEvent.click(changeBtn);
		await expect(args.onOpenForm).toHaveBeenCalledTimes(1);
	},
};
