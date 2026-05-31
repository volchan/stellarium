import type { Meta, StoryObj } from "@storybook/vue3";
import { expect, fn } from "storybook/test";
import Button from "./Button.vue";

const meta = {
	title: "UI/Button",
	component: Button,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: { type: "radio" },
			options: ["default", "ghost", "icon"],
			description: "Visual style of the button",
			table: {
				defaultValue: { summary: "default" },
				type: { summary: "string" },
				category: "Props",
			},
		},
		class: {
			control: "text",
			description: "Additional CSS classes to apply",
			table: { category: "Props" },
		},
		default: {
			control: "text",
			description: "Slot content rendered inside the button",
			table: { category: "Slots" },
		},
		onClick: {
			control: false,
			description: "Native click event",
			table: { category: "Events" },
		},
	},
	args: {
		onClick: fn(),
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: "default",
		default: "Save changes",
	},
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `<Button v-bind="args" @click="args.onClick">{{ args.default }}</Button>`,
	}),
	play: async ({ canvas, args, userEvent }) => {
		const button = canvas.getByRole("button", { name: "Save changes" });
		await expect(button).toBeInTheDocument();
		await expect(button).toBeVisible();
		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		default: "Cancel",
	},
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `<Button v-bind="args" @click="args.onClick">{{ args.default }}</Button>`,
	}),
	play: async ({ canvas, args, userEvent }) => {
		const button = canvas.getByRole("button", { name: "Cancel" });
		await expect(button).toBeInTheDocument();
		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalled();
	},
};

export const Icon: Story = {
	args: {
		variant: "icon",
		default: "✕",
	},
	render: (args) => ({
		components: { Button },
		setup() {
			return { args };
		},
		template: `<Button v-bind="args" @click="args.onClick">{{ args.default }}</Button>`,
	}),
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "✕" });
		await expect(button).toBeInTheDocument();
		await expect(button).toBeVisible();
	},
};

export const AllVariants: Story = {
	render: () => ({
		components: { Button },
		template: `
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <Button variant="default">Save changes</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="icon">✕</Button>
      </div>
    `,
	}),
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");
		await expect(buttons).toHaveLength(3);
		for (const btn of buttons) {
			await expect(btn).toBeVisible();
		}
	},
};
