import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import MapPicker from "./MapPicker.vue";

const meta = {
	title: "Components/MapPicker",
	component: MapPicker,
	tags: ["autodocs"],
	argTypes: {
		lat: {
			control: { type: "number" },
			description: "Initial latitude (-90 to 90). Centers the map and places the marker.",
			table: {
				type: { summary: "number" },
				defaultValue: { summary: "48.8566" },
				category: "Props",
			},
		},
		lon: {
			control: { type: "number" },
			description: "Initial longitude (-180 to 180). Centers the map and places the marker.",
			table: {
				type: { summary: "number" },
				defaultValue: { summary: "2.3522" },
				category: "Props",
			},
		},
		visible: {
			control: { type: "boolean" },
			description: "Triggers map.invalidateSize() after becoming true — use after CSS transitions.",
			table: {
				type: { summary: "boolean" },
				defaultValue: { summary: "true" },
				category: "Props",
			},
		},
		onPick: {
			action: "pick",
			description: "Emitted when the user clicks the map or finishes dragging the marker.",
			table: {
				type: { summary: "{ lat: number; lon: number }" },
				category: "Emits",
			},
		},
	},
	args: {
		lat: 48.8566,
		lon: 2.3522,
		visible: true,
	},
} satisfies Meta<typeof MapPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const container = canvas.getByTestId("map-picker");
		await expect(container).toBeInTheDocument();
	},
};

export const NewYork: Story = {
	args: {
		lat: 40.7128,
		lon: -74.006,
	},
	play: async ({ canvas }) => {
		const container = canvas.getByTestId("map-picker");
		await expect(container).toBeInTheDocument();
	},
};

export const Tokyo: Story = {
	args: {
		lat: 35.6762,
		lon: 139.6503,
	},
};

export const SouthernHemisphere: Story = {
	args: {
		lat: -33.8688,
		lon: 151.2093,
	},
};
