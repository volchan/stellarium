import type { Meta, StoryObj } from "@storybook/vue3";
import { expect, fn } from "storybook/test";
import { ref } from "vue";
import Slider from "./Slider.vue";

const meta = {
	title: "UI/Slider",
	component: Slider,
	tags: ["autodocs"],
	argTypes: {
		modelValue: {
			control: { type: "range", min: 0, max: 100, step: 1 },
			description: "Current numeric value of the slider",
			table: {
				defaultValue: { summary: "0" },
				type: { summary: "number" },
				category: "Props",
			},
		},
		min: {
			control: "number",
			description: "Minimum allowed value",
			table: {
				defaultValue: { summary: "0" },
				type: { summary: "number" },
				category: "Props",
			},
		},
		max: {
			control: "number",
			description: "Maximum allowed value",
			table: {
				defaultValue: { summary: "100" },
				type: { summary: "number" },
				category: "Props",
			},
		},
		step: {
			control: "number",
			description: "Increment step between values",
			table: {
				defaultValue: { summary: "1" },
				type: { summary: "number" },
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
			description: "Emitted when the value changes",
			table: { category: "Events" },
		},
	},
	args: {
		modelValue: 50,
		min: 0,
		max: 100,
		step: 1,
		"onUpdate:modelValue": fn(),
	},
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		modelValue: 50,
		min: 0,
		max: 100,
		step: 1,
	},
	render: (args) => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template: `<div style="width:200px;padding:16px;"><Slider v-bind="args" /></div>`,
	}),
	play: async ({ canvas }) => {
		const thumb = canvas.getByRole("slider");
		await expect(thumb).toBeInTheDocument();
		await expect(thumb).toBeVisible();
		await expect(thumb).toHaveAttribute("aria-valuenow", "50");
		await expect(thumb).toHaveAttribute("aria-valuemin", "0");
		await expect(thumb).toHaveAttribute("aria-valuemax", "100");
	},
};

export const AtMinimum: Story = {
	args: {
		modelValue: 0,
		min: 0,
		max: 100,
		step: 1,
	},
	render: (args) => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template: `<div style="width:200px;padding:16px;"><Slider v-bind="args" /></div>`,
	}),
	play: async ({ canvas }) => {
		const thumb = canvas.getByRole("slider");
		await expect(thumb).toHaveAttribute("aria-valuenow", "0");
	},
};

export const AtMaximum: Story = {
	args: {
		modelValue: 100,
		min: 0,
		max: 100,
		step: 1,
	},
	render: (args) => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template: `<div style="width:200px;padding:16px;"><Slider v-bind="args" /></div>`,
	}),
	play: async ({ canvas }) => {
		const thumb = canvas.getByRole("slider");
		await expect(thumb).toHaveAttribute("aria-valuenow", "100");
	},
};

export const MagnitudeLimit: Story = {
	name: "Magnitude limit (0–6.5)",
	args: {
		modelValue: 4.5,
		min: 0,
		max: 6.5,
		step: 0.5,
	},
	render: (args) => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template: `<div style="width:200px;padding:16px;"><Slider v-bind="args" /></div>`,
	}),
	play: async ({ canvas }) => {
		const thumb = canvas.getByRole("slider");
		await expect(thumb).toHaveAttribute("aria-valuenow", "4.5");
		await expect(thumb).toHaveAttribute("aria-valuemin", "0");
		await expect(thumb).toHaveAttribute("aria-valuemax", "6.5");
	},
};

export const Interactive: Story = {
	render: () => ({
		components: { Slider },
		setup() {
			const val = ref(30);
			return { val };
		},
		template: `
      <div style="width:200px;padding:16px;">
        <Slider v-model="val" :min="0" :max="100" :step="1" />
        <p data-testid="current-value" style="margin-top:8px;font-size:12px;color:var(--muted);">Value: {{ val }}</p>
      </div>
    `,
	}),
	play: async ({ canvas, step, userEvent }) => {
		const thumb = canvas.getByRole("slider");

		await step("Initial value is rendered", async () => {
			await expect(thumb).toBeInTheDocument();
			await expect(canvas.getByTestId("current-value")).toHaveTextContent(
				"Value: 30",
			);
		});

		await step("Arrow key increments value", async () => {
			thumb.focus();
			await userEvent.keyboard("{ArrowRight}");
			await expect(thumb).toHaveAttribute("aria-valuenow", "31");
		});

		await step("Arrow key decrements value", async () => {
			await userEvent.keyboard("{ArrowLeft}");
			await expect(thumb).toHaveAttribute("aria-valuenow", "30");
		});
	},
};
