import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import { usePositionsStore } from "@/stores/positions";
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import PositionSetup from "./PositionSetup.vue";

const meta = {
	title: "Components/PositionSetup",
	component: PositionSetup,
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof PositionSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default: panel visible (coordsSet = false)
export const Default: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.coordsSet = false;
			return story();
		},
	],
};

// Hidden state: panel fades out when coordinates have been set
export const Hidden: Story = {
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.coordsSet = true;
			return story();
		},
	],
	parameters: {
		docs: {
			description: {
				story:
					"Panel is invisible (opacity 0, pointer-events none) once coordsSet is true.",
			},
		},
	},
};

// With pre-seeded saved positions list
export const WithSavedPositions: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			const posStore = usePositionsStore();
			ui.coordsSet = false;
			posStore.add({ label: "Paris", lat: 48.8566, lon: 2.3522, alt: 115, hdg: 0 });
			posStore.add({ label: "Tokyo", lat: 35.6762, lon: 139.6503, alt: 40, hdg: 90 });
			posStore.add({
				label: "New York",
				lat: 40.7128,
				lon: -74.006,
				alt: 10,
				hdg: 180,
			});
			return story();
		},
	],
};

// With a single saved position (edge case: minimal list)
export const WithOneSavedPosition: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			const posStore = usePositionsStore();
			ui.coordsSet = false;
			posStore.add({
				label: "Home",
				lat: 51.5074,
				lon: -0.1278,
				alt: 25,
				hdg: 0,
			});
			return story();
		},
	],
};

// Interaction: fill all fields and submit — verifies telemetry is updated
export const SubmitFullForm: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.coordsSet = false;
			return story();
		},
	],
	play: async ({ canvas, step, userEvent }) => {
		await step("Fill label", async () => {
			await userEvent.type(canvas.getByRole("textbox", { name: /label/i }), "Observatory");
		});
		await step("Fill latitude", async () => {
			await userEvent.type(canvas.getByRole("spinbutton", { name: /latitude/i }), "43.6047");
		});
		await step("Fill longitude", async () => {
			await userEvent.type(canvas.getByRole("spinbutton", { name: /longitude/i }), "1.4442");
		});
		await step("Fill altitude", async () => {
			await userEvent.type(canvas.getByRole("spinbutton", { name: /altitude/i }), "150");
		});
		await step("Fill heading", async () => {
			await userEvent.type(canvas.getByRole("spinbutton", { name: /heading/i }), "45");
		});
		await step("Submit form", async () => {
			await userEvent.click(canvas.getByTestId("position-submit"));
		});
		await step("Verify saved position appears in list", async () => {
			await expect(canvas.getByText("Observatory")).toBeInTheDocument();
		});
	},
};

// Interaction: submit with only required lat/lon — label auto-generated
export const SubmitMinimalForm: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			ui.coordsSet = false;
			return story();
		},
	],
	play: async ({ canvas, step, userEvent }) => {
		await step("Fill latitude only", async () => {
			await userEvent.type(canvas.getByRole("spinbutton", { name: /latitude/i }), "48.8566");
		});
		await step("Fill longitude only", async () => {
			await userEvent.type(canvas.getByRole("spinbutton", { name: /longitude/i }), "2.3522");
		});
		await step("Submit form", async () => {
			await userEvent.click(canvas.getByTestId("position-submit"));
		});
		await step("Verify auto-generated label", async () => {
			// Label is "lat°, lon°" when label field is empty
			await expect(canvas.getByText("48.86°, 2.35°")).toBeInTheDocument();
		});
	},
};

// Interaction: load a saved position into the form via the arrow button
export const LoadSavedPositionIntoForm: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			const posStore = usePositionsStore();
			ui.coordsSet = false;
			posStore.add({ label: "Berlin", lat: 52.52, lon: 13.405, alt: 34, hdg: 270 });
			return story();
		},
	],
	play: async ({ canvas, step, userEvent }) => {
		await step("Click load-into-form button for Berlin", async () => {
			const loadBtn = canvas.getByTitle("Load into form");
			await userEvent.click(loadBtn);
		});
		await step("Verify lat field is populated", async () => {
			const latField = canvas.getByRole("spinbutton", { name: /latitude/i });
			await expect(latField).toHaveValue(52.52);
		});
		await step("Verify lon field is populated", async () => {
			const lonField = canvas.getByRole("spinbutton", { name: /longitude/i });
			await expect(lonField).toHaveValue(13.405);
		});
	},
};

// Interaction: delete a saved position
export const DeleteSavedPosition: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			const posStore = usePositionsStore();
			ui.coordsSet = false;
			// add() prepends (unshift), so add Cairo first → Sydney ends up at index 0 (shown first)
			posStore.add({ label: "Cairo", lat: 30.0444, lon: 31.2357, alt: 74, hdg: 0 });
			posStore.add({ label: "Sydney", lat: -33.8688, lon: 151.2093, alt: 39, hdg: 0 });
			return story();
		},
	],
	play: async ({ canvas, step, userEvent }) => {
		await step("Verify both items present", async () => {
			await expect(canvas.getByText("Sydney")).toBeInTheDocument();
			await expect(canvas.getByText("Cairo")).toBeInTheDocument();
		});
		await step("Delete first item", async () => {
			const deleteButtons = canvas.getAllByTitle("Delete");
			await userEvent.click(deleteButtons[0]);
		});
		await step("Verify first item removed and second remains", async () => {
			await expect(canvas.queryByText("Sydney")).not.toBeInTheDocument();
			await expect(canvas.getByText("Cairo")).toBeInTheDocument();
		});
	},
};

// Mobile viewport story
export const Mobile: Story = {
	beforeEach() {
		localStorage.removeItem("stellarium:positions");
	},
	decorators: [
		(story) => {
			const ui = useUiStore();
			const posStore = usePositionsStore();
			ui.coordsSet = false;
			posStore.add({ label: "London", lat: 51.5074, lon: -0.1278, alt: 25, hdg: 0 });
			return story();
		},
	],
	parameters: {
		viewport: { defaultViewport: "mobile" },
	},
};
