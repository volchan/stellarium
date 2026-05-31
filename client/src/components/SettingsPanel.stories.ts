import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import SettingsPanel from "./SettingsPanel.vue";

const meta = {
	title: "Components/SettingsPanel",
	component: SettingsPanel,
	argTypes: {
		starsCount: {
			control: { type: "number" },
			description: "Number of stars loaded from the HYG catalog",
			table: {
				type: { summary: "number" },
				defaultValue: { summary: "0" },
				category: "Props",
			},
		},
		constsCount: {
			control: { type: "number" },
			description: "Number of IAU constellations loaded",
			table: {
				type: { summary: "number" },
				defaultValue: { summary: "0" },
				category: "Props",
			},
		},
	},
	args: {
		starsCount: 0,
		constsCount: 0,
	},
	parameters: {
		backgrounds: {
			default: "dark",
			values: [{ name: "dark", value: "#07080f" }],
		},
		layout: "fullscreen",
	},
} satisfies Meta<typeof SettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.settingsOpen = false;
			const settings = useSettingsStore();
			settings.constLines = true;
			settings.constNames = true;
			settings.starLabels = true;
			settings.showSun = true;
			settings.showMoon = true;
			settings.mag = 6.5;
			settings.fov = 90;
			return story();
		},
	],
	args: {
		starsCount: 0,
		constsCount: 0,
	},
};

export const Open: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.settingsOpen = true;
			const settings = useSettingsStore();
			settings.constLines = true;
			settings.constNames = false;
			settings.starLabels = true;
			settings.showSun = true;
			settings.showMoon = true;
			settings.mag = 5.0;
			settings.fov = 75;
			return story();
		},
	],
	args: {
		starsCount: 0,
		constsCount: 0,
	},
	play: async ({ canvas, userEvent, step }) => {
		await step("Panel is visible in the open state", async () => {
			const panel = canvas.getByTestId("settings-panel");
			await expect(panel).toBeInTheDocument();
			await expect(panel).toHaveClass("open");
		});

		await step("Constellation lines toggle is present and clickable", async () => {
			const toggle = canvas.getByTestId("toggle-const-lines");
			await expect(toggle).toBeInTheDocument();
			await userEvent.click(toggle);
		});

		await step("Magnitude slider is present", async () => {
			const sliders = canvas.getAllByRole("slider");
			await expect(sliders.length).toBeGreaterThanOrEqual(2);
		});
	},
};

export const WithCatalogData: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.settingsOpen = true;
			const settings = useSettingsStore();
			settings.constLines = true;
			settings.constNames = true;
			settings.starLabels = false;
			settings.showSun = true;
			settings.showMoon = true;
			settings.mag = 6.5;
			settings.fov = 90;
			return story();
		},
	],
	args: {
		starsCount: 9096,
		constsCount: 88,
	},
};
