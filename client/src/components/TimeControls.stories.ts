import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { createPinia, setActivePinia } from "pinia";
import type { Decorator } from "@storybook/vue3";
import TimeControls from "./TimeControls.vue";
import { useTelemetryStore } from "@/stores/telemetry";

// Fresh Pinia per story — the global preview decorator does this too,
// but we also do it here so each story's beforeEach starts clean.
const withPinia: Decorator = (story) => ({
	components: { story },
	setup() {
		setActivePinia(createPinia());
		return {};
	},
	template: "<story />",
});

const meta = {
	title: "Components/TimeControls",
	component: TimeControls,
	decorators: [withPinia],
	parameters: {
		layout: "centered",
		backgrounds: { default: "sky" },
	},
} satisfies Meta<typeof TimeControls>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Live mode (default) ──────────────────────────────────────────────────────
// timeOffset=0, timeSpeed=1 → isLive=true → "Now" button is disabled, 1× is active

export const LiveMode: Story = {
	name: "Live mode (default)",
	play: async ({ canvas }) => {
		const nowBtn = canvas.getByRole("button", { name: "Return to live time" });
		await expect(nowBtn).toBeDisabled();

		// 1× speed button must carry the active class
		const speed1 = canvas.getByRole("button", { name: "1× speed" });
		await expect(speed1).toHaveClass(/active/);

		// 10× should NOT be active
		const speed10 = canvas.getByRole("button", { name: "10× speed" });
		await expect(speed10).not.toHaveClass(/active/);
	},
};

// ─── Offset mode ─────────────────────────────────────────────────────────────
// timeOffset != 0 → "Now" button is enabled

export const OffsetMode: Story = {
	name: "Offset mode (time shifted)",
	decorators: [
		(story) => {
			setActivePinia(createPinia());
			const telemetry = useTelemetryStore();
			telemetry.stepTime(3600); // +1 hour offset
			return story();
		},
	],
	play: async ({ canvas }) => {
		const nowBtn = canvas.getByRole("button", { name: "Return to live time" });
		await expect(nowBtn).not.toBeDisabled();
	},
};

// ─── Fast-speed mode ─────────────────────────────────────────────────────────
// timeSpeed=1000 → 1000× speed button is active

export const FastSpeedMode: Story = {
	name: "Fast speed (1000×)",
	decorators: [
		(story) => {
			setActivePinia(createPinia());
			const telemetry = useTelemetryStore();
			telemetry.setSpeed(1000);
			return story();
		},
	],
	play: async ({ canvas }) => {
		const speed1000 = canvas.getByRole("button", { name: "1000× speed" });
		await expect(speed1000).toHaveClass(/active/);

		const speed1 = canvas.getByRole("button", { name: "1× speed" });
		await expect(speed1).not.toHaveClass(/active/);
	},
};

// ─── Step forward interaction ─────────────────────────────────────────────────
// Click "+1h" → store timeOffset increases → "Now" button becomes enabled

export const StepForwardInteraction: Story = {
	name: "Step forward — click +1h",
	play: async ({ canvas, userEvent }) => {
		// Confirm "Now" starts disabled (live mode)
		const nowBtn = canvas.getByRole("button", { name: "Return to live time" });
		await expect(nowBtn).toBeDisabled();

		// Click "+1 hour"
		const plusOneH = canvas.getByRole("button", { name: "+1 hour" });
		await userEvent.click(plusOneH);

		// "Now" should now be enabled since offset != 0
		await expect(nowBtn).not.toBeDisabled();
	},
};

// ─── Reset to Now interaction ─────────────────────────────────────────────────
// Start with an offset, click "Now" → offset returns to 0 → button re-disables

export const ResetToNowInteraction: Story = {
	name: "Reset to Now interaction",
	decorators: [
		(story) => {
			setActivePinia(createPinia());
			const telemetry = useTelemetryStore();
			telemetry.stepTime(-86400); // −1 day
			telemetry.setSpeed(100);    // 100× speed
			return story();
		},
	],
	play: async ({ canvas, userEvent }) => {
		const nowBtn = canvas.getByRole("button", { name: "Return to live time" });
		await expect(nowBtn).not.toBeDisabled();

		await userEvent.click(nowBtn);

		// After reset: offset=0 + speed=1 → live → button is disabled again
		await expect(nowBtn).toBeDisabled();

		// 1× speed must be active again
		const speed1 = canvas.getByRole("button", { name: "1× speed" });
		await expect(speed1).toHaveClass(/active/);
	},
};

// ─── Speed change interaction ─────────────────────────────────────────────────
// Click 100× → that button becomes active

export const SpeedChangeInteraction: Story = {
	name: "Speed change — click 100×",
	play: async ({ canvas, userEvent }) => {
		const speed100 = canvas.getByRole("button", { name: "100× speed" });
		await expect(speed100).not.toHaveClass(/active/);

		await userEvent.click(speed100);

		await expect(speed100).toHaveClass(/active/);

		// 1× should lose active state
		const speed1 = canvas.getByRole("button", { name: "1× speed" });
		await expect(speed1).not.toHaveClass(/active/);
	},
};
