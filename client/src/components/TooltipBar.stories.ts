import type { Meta, StoryObj } from "@storybook/vue3";
import { expect } from "storybook/test";
import TooltipBar from "./TooltipBar.vue";

const meta = {
	title: "HUD/TooltipBar",
	component: TooltipBar,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Footer bar fixed at the bottom of the HUD. Shows a keyboard hint when no star is hovered.",
			},
		},
	},
} satisfies Meta<typeof TooltipBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	name: "Default (hint visible)",
	play: async ({ canvas }) => {
		const footer = canvas.getByRole("contentinfo");
		await expect(footer).toBeInTheDocument();

		const hint = canvas.getByText(/Hover a star/);
		await expect(hint).toBeVisible();

		// Verify both keyboard shortcut hints are rendered
		const kbdElements = footer.querySelectorAll("kbd");
		await expect(kbdElements.length).toBe(2);
		await expect(kbdElements[0].textContent).toBe("Click");
		await expect(kbdElements[1].textContent).toBe("S");
	},
};
