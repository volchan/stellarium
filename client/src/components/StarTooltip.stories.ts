import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { useUiStore } from "@/stores/ui";
import type { VisibleStar } from "@/lib/renderer";
import StarTooltip from "./StarTooltip.vue";

// Reusable fixture: a well-known bright star with all fields populated
const sirius: VisibleStar = {
	star: {
		id: 32349,
		hip: 32349,
		ra: 6.7525,
		dec: -16.7161,
		mag: -1.46,
		proper: "Sirius",
		bf: "9 Alp CMa",
		ci: 0.0,
		dist: 2.637,
		spect: "A1V",
		con: "CMa",
	},
	x: 400,
	y: 300,
	altAz: { alt: 45, az: 180 },
};

// A star with only minimal fields (no proper name, no dist, no constellation)
const anonymousStar: VisibleStar = {
	star: {
		id: 99999,
		hip: 99999,
		ra: 10.5,
		dec: 20.0,
		mag: 5.3,
		ci: 1.2,
		spect: "K5",
	},
	x: 600,
	y: 200,
	altAz: { alt: 30, az: 90 },
};

// A star identified only by HIP number
const hipOnlyStar: VisibleStar = {
	star: {
		id: 11767,
		hip: 11767,
		ra: 2.53,
		dec: 89.26,
		mag: 1.97,
		ci: 0.636,
		dist: 132.06,
		spect: "F7",
		con: "UMi",
	},
	x: 640,
	y: 360,
	altAz: { alt: 60, az: 0 },
};

// Sun (solar body: negative id, phase populated)
const sun: VisibleStar = {
	star: {
		id: -1,
		hip: -1,
		ra: 0,
		dec: 0,
		mag: -26.74,
		proper: "Sun",
		ci: 0.65,
		distAU: 1.0,
		phase: 1.0,
	},
	x: 800,
	y: 400,
	altAz: { alt: 25, az: 270 },
};

const meta = {
	title: "HUD/StarTooltip",
	component: StarTooltip,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Floating tooltip that appears near the cursor when a star is hovered. Reads hoveredStar from the ui Pinia store. Renders nothing when hoveredStar is null.",
			},
		},
	},
} satisfies Meta<typeof StarTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hidden: Story = {
	name: "Hidden (no hovered star)",
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.hoveredStar = null;
			return story();
		},
	],
	play: async ({ canvas }) => {
		// Tooltip must not be in the DOM when hoveredStar is null
		const tooltip = canvas.queryByText(/Sirius|HIP|—/);
		await expect(tooltip).toBeNull();
	},
};

export const FullStar: Story = {
	name: "Full data — Sirius",
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.hoveredStar = sirius;
			return story();
		},
	],
	play: async ({ canvas }) => {
		const name = await canvas.findByText("Sirius");
		await expect(name).toBeVisible();

		const spect = canvas.getByText("A1V");
		await expect(spect).toBeVisible();

		// Magnitude is negative — should be rendered without a leading +
		const mag = canvas.getByText("-1.5");
		await expect(mag).toBeVisible();

		// Distance should be formatted as ly (2.637 pc ≈ 8.6 ly)
		const dist = canvas.getByText(/8\.\d ly/);
		await expect(dist).toBeVisible();

		// Constellation abbreviation
		const con = canvas.getByText("CMa");
		await expect(con).toBeVisible();
	},
};

export const MinimalStar: Story = {
	name: "Minimal data (no name, no dist, no constellation)",
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.hoveredStar = anonymousStar;
			return story();
		},
	],
	play: async ({ canvas }) => {
		// No proper/bf name and no hip match → falls through to "—" placeholder
		// anonymousStar has hip=99999 so it renders "HIP 99999"
		const name = await canvas.findByText("HIP 99999");
		await expect(name).toBeVisible();

		const spect = canvas.getByText("K5");
		await expect(spect).toBeVisible();

		// Magnitude +5.3
		const mag = canvas.getByText("+5.3");
		await expect(mag).toBeVisible();

		// No dist row should appear
		const dist = canvas.queryByText(/ly/);
		await expect(dist).toBeNull();
	},
};

export const HipIdentifiedStar: Story = {
	name: "HIP-identified star (Polaris)",
	decorators: [
		(story) => {
			const ui = useUiStore();
			// Remove proper name so it falls back to HIP
			ui.hoveredStar = {
				...hipOnlyStar,
				star: { ...hipOnlyStar.star, proper: undefined, bf: undefined },
			};
			return story();
		},
	],
	play: async ({ canvas }) => {
		const name = await canvas.findByText("HIP 11767");
		await expect(name).toBeVisible();

		const con = canvas.getByText("UMi");
		await expect(con).toBeVisible();

		// Distance > 100 ly → rounded integer
		const dist = canvas.getByText(/\d{3}[,\d]* ly/);
		await expect(dist).toBeVisible();
	},
};

export const SolarBody: Story = {
	name: "Solar body — Sun",
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.hoveredStar = sun;
			return story();
		},
	],
	play: async ({ canvas }) => {
		const name = await canvas.findByText("Sun");
		await expect(name).toBeVisible();

		// Magnitude is very negative
		const mag = canvas.getByText("-26.7");
		await expect(mag).toBeVisible();
	},
};
