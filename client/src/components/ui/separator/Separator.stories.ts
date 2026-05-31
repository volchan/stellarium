import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import Separator from "./Separator.vue";

const meta = {
	title: "UI/Separator",
	component: Separator,
	tags: ["autodocs"],
	argTypes: {
		orientation: {
			control: { type: "radio" },
			options: ["horizontal", "vertical"],
			description: "Direction of the separator line",
			table: {
				defaultValue: { summary: "horizontal" },
				type: { summary: '"horizontal" | "vertical"' },
				category: "Props",
			},
		},
		class: {
			control: "text",
			description: "Additional CSS classes to apply",
			table: { category: "Props" },
		},
	},
	args: {
		orientation: "horizontal",
	},
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	args: {
		orientation: "horizontal",
	},
	render: (args) => ({
		components: { Separator },
		setup() {
			return { args };
		},
		template: `
      <div style="width:200px;padding:16px;">
        <p style="color:var(--fg);font-size:12px;">Above</p>
        <Separator v-bind="args" style="margin:8px 0;" />
        <p style="color:var(--fg);font-size:12px;">Below</p>
      </div>
    `,
	}),
	play: async ({ canvas }) => {
		const separator = canvas.getByRole("separator");
		await expect(separator).toBeInTheDocument();
		await expect(separator).toBeVisible();
		await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
	},
};

export const Vertical: Story = {
	args: {
		orientation: "vertical",
	},
	render: (args) => ({
		components: { Separator },
		setup() {
			return { args };
		},
		template: `
      <div style="display:flex;align-items:center;gap:8px;padding:16px;height:48px;">
        <span style="color:var(--fg);font-size:12px;">Left</span>
        <Separator v-bind="args" />
        <span style="color:var(--fg);font-size:12px;">Right</span>
      </div>
    `,
	}),
	play: async ({ canvas }) => {
		const separator = canvas.getByRole("separator");
		await expect(separator).toBeInTheDocument();
		await expect(separator).toHaveAttribute("aria-orientation", "vertical");
	},
};

export const InToolbar: Story = {
	name: "In Toolbar (mixed)",
	render: () => ({
		components: { Separator },
		template: `
      <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--surface-1,#0d0f1a);border-radius:6px;width:fit-content;">
        <span style="color:var(--fg);font-size:12px;">Stars</span>
        <Separator orientation="vertical" style="height:16px;" />
        <span style="color:var(--fg);font-size:12px;">Planets</span>
        <Separator orientation="vertical" style="height:16px;" />
        <span style="color:var(--fg);font-size:12px;">Constellations</span>
      </div>
    `,
	}),
	play: async ({ canvas }) => {
		const separators = canvas.getAllByRole("separator");
		await expect(separators).toHaveLength(2);
		for (const sep of separators) {
			await expect(sep).toHaveAttribute("aria-orientation", "vertical");
		}
	},
};

export const InSettingsPanel: Story = {
	name: "In Settings Panel (horizontal stacked)",
	render: () => ({
		components: { Separator },
		template: `
      <div style="width:200px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <span style="color:var(--fg);font-size:12px;">Star labels</span>
        <Separator orientation="horizontal" />
        <span style="color:var(--fg);font-size:12px;">Constellation lines</span>
        <Separator orientation="horizontal" />
        <span style="color:var(--fg);font-size:12px;">Field of view</span>
      </div>
    `,
	}),
	play: async ({ canvas }) => {
		const separators = canvas.getAllByRole("separator");
		await expect(separators).toHaveLength(2);
		for (const sep of separators) {
			await expect(sep).toHaveAttribute("aria-orientation", "horizontal");
		}
	},
};
