import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { useUiStore } from "@/stores/ui";
import StarCard from "./StarCard.vue";

const meta = {
	title: "Components/StarCard",
	component: StarCard,
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof StarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Shared fixtures ──────────────────────────────────────────────────────────

const SIRIUS = {
	id: 32349,
	hip: 32349,
	ra: 6.7525,
	dec: -16.7161,
	mag: -1.46,
	proper: "Sirius",
	bf: "Alp CMa",
	con: "CMa",
	spect: "A1V",
	ci: 0.009,
	dist: 2.637,
};

const SUN = {
	id: -1,
	hip: -1,
	ra: 5.5,
	dec: 20.1,
	mag: -26.74,
	proper: "Sun",
	distAU: 0.9834,
	phase: undefined as undefined,
};

const MOON = {
	id: -2,
	hip: -2,
	ra: 12.3,
	dec: -5.2,
	mag: -12.74,
	proper: "Moon",
	distAU: 0.00257,
	phase: 0.72,
};

const ALT_AZ = { alt: 45.2, az: 187.3 };

// ── Stories ──────────────────────────────────────────────────────────────────

export const Hidden: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.pinnedStar = null;
			return story();
		},
	],
};

export const NormalStar: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.pinnedStar = { star: SIRIUS, x: 400, y: 300, altAz: ALT_AZ };
			return story();
		},
	],
	play: async ({ canvas, step, userEvent }) => {
		await step("Star name is displayed", async () => {
			const name = canvas.getByTestId("star-name");
			await expect(name).toBeInTheDocument();
			await expect(name).toHaveTextContent("Sirius");
		});

		await step("Close button sets pinnedStar to null", async () => {
			const closeBtn = canvas.getByTitle("Close");
			await userEvent.click(closeBtn);
			const card = canvas.getByTestId("star-card");
			await expect(card).not.toHaveClass("visible");
		});
	},
};

export const Sun: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.pinnedStar = { star: SUN, x: 400, y: 300, altAz: ALT_AZ };
			return story();
		},
	],
};

export const Moon: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.pinnedStar = { star: MOON, x: 400, y: 300, altAz: ALT_AZ };
			return story();
		},
	],
	play: async ({ canvas, step }) => {
		await step("Star name shows Moon", async () => {
			const name = canvas.getByTestId("star-name");
			await expect(name).toHaveTextContent("Moon");
		});

		await step("Illumination stat is visible", async () => {
			const stats = canvas.getAllByText("Illumination");
			await expect(stats.length).toBeGreaterThan(0);
		});
	},
};
