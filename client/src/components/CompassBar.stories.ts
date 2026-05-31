import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { createPinia, setActivePinia } from "pinia";
import type { Decorator } from "@storybook/vue3";
import CompassBar from "./CompassBar.vue";
import { useUiStore } from "@/stores/ui";

const withPinia: Decorator = (story) => ({
	components: { story },
	setup() {
		setActivePinia(createPinia());
		return {};
	},
	template: "<story />",
});

const meta = {
	title: "Components/CompassBar",
	component: CompassBar,
	decorators: [withPinia],
	parameters: {
		// CompassBar is position:absolute full-width — give it a realistic container
		layout: "fullscreen",
		backgrounds: { default: "sky" },
	},
} satisfies Meta<typeof CompassBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Facing North (0°) ───────────────────────────────────────────────────────

export const FacingNorth: Story = {
	name: "Facing North (0°)",
	beforeEach() {
		setActivePinia(createPinia());
		const ui = useUiStore();
		ui.camera.az = 0;
	},
	play: async () => {
		const el = document.querySelector("canvas.compass-bar") as HTMLCanvasElement | null;
		await expect(el).not.toBeNull();
		await expect(el!.offsetWidth).toBeGreaterThan(0);
	},
};

// ─── Facing East (90°) ───────────────────────────────────────────────────────

export const FacingEast: Story = {
	name: "Facing East (90°)",
	beforeEach() {
		setActivePinia(createPinia());
		const ui = useUiStore();
		ui.camera.az = 90;
	},
	play: async ({ canvas: _canvas }) => {
		const el = document.querySelector("canvas.compass-bar") as HTMLCanvasElement | null;
		await expect(el).not.toBeNull();
		await expect(el!.offsetWidth).toBeGreaterThan(0);
	},
};

// ─── Facing South (180°) ─────────────────────────────────────────────────────

export const FacingSouth: Story = {
	name: "Facing South (180°)",
	beforeEach() {
		setActivePinia(createPinia());
		const ui = useUiStore();
		ui.camera.az = 180;
	},
	play: async ({ canvas: _canvas }) => {
		const el = document.querySelector("canvas.compass-bar") as HTMLCanvasElement | null;
		await expect(el).not.toBeNull();
	},
};

// ─── Facing West (270°) ──────────────────────────────────────────────────────

export const FacingWest: Story = {
	name: "Facing West (270°)",
	beforeEach() {
		setActivePinia(createPinia());
		const ui = useUiStore();
		ui.camera.az = 270;
	},
	play: async ({ canvas: _canvas }) => {
		const el = document.querySelector("canvas.compass-bar") as HTMLCanvasElement | null;
		await expect(el).not.toBeNull();
	},
};

// ─── Non-cardinal angle (47°) ─────────────────────────────────────────────────
// Confirms the bar renders cleanly at an angle between cardinal points

export const NonCardinalAngle: Story = {
	name: "Non-cardinal angle (47°)",
	beforeEach() {
		setActivePinia(createPinia());
		const ui = useUiStore();
		ui.camera.az = 47;
	},
	play: async ({ canvas: _canvas }) => {
		const el = document.querySelector("canvas.compass-bar") as HTMLCanvasElement | null;
		await expect(el).not.toBeNull();
		// Canvas must have been sized (resize() called on mount)
		await expect(el!.width).toBeGreaterThan(0);
		await expect(el!.height).toBeGreaterThan(0);
	},
};

// ─── Full rotation (359°) — wrap-around edge case ────────────────────────────

export const NearFullRotation: Story = {
	name: "Near full rotation (359°) — wrap-around",
	beforeEach() {
		setActivePinia(createPinia());
		const ui = useUiStore();
		ui.camera.az = 359;
	},
	play: async ({ canvas: _canvas }) => {
		const el = document.querySelector("canvas.compass-bar") as HTMLCanvasElement | null;
		await expect(el).not.toBeNull();
	},
};
