import type { Meta, StoryObj } from "@storybook/vue3";
import { expect, fn } from "storybook/test";
import { ref } from "vue";
import Switch from "./Switch.vue";

const meta = {
	title: "UI/Switch",
	component: Switch,
	tags: ["autodocs"],
	argTypes: {
		modelValue: {
			control: "boolean",
			description: "Current toggle state (true = on, false = off)",
			table: {
				defaultValue: { summary: "false" },
				type: { summary: "boolean" },
				category: "Props",
			},
		},
		class: {
			control: "text",
			description: "Additional CSS classes to apply",
			table: { category: "Props" },
		},
		"onUpdate:modelValue": {
			control: false,
			description: "Emitted when the toggle state changes",
			table: { category: "Events" },
		},
	},
	args: {
		modelValue: false,
		"onUpdate:modelValue": fn(),
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
	args: {
		modelValue: false,
	},
	play: async ({ canvas }) => {
		const sw = canvas.getByRole("switch");
		await expect(sw).toBeInTheDocument();
		await expect(sw).toBeVisible();
		await expect(sw).toHaveAttribute("aria-checked", "false");
	},
};

export const On: Story = {
	args: {
		modelValue: true,
	},
	play: async ({ canvas }) => {
		const sw = canvas.getByRole("switch");
		await expect(sw).toBeInTheDocument();
		await expect(sw).toHaveAttribute("aria-checked", "true");
	},
};

export const Interactive: Story = {
	render: (args) => ({
		components: { Switch },
		setup() {
			const val = ref(false);
			return { val, args };
		},
		template: `<Switch v-model="val" />`,
	}),
	play: async ({ canvas, userEvent, step }) => {
		const sw = canvas.getByRole("switch");

		await step("Initial state is off", async () => {
			await expect(sw).toBeInTheDocument();
			await expect(sw).toHaveAttribute("aria-checked", "false");
		});

		await step("Click turns the switch on", async () => {
			await userEvent.click(sw);
			await expect(sw).toHaveAttribute("aria-checked", "true");
		});

		await step("Second click turns the switch off", async () => {
			await userEvent.click(sw);
			await expect(sw).toHaveAttribute("aria-checked", "false");
		});
	},
};
