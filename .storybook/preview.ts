import { createPinia, setActivePinia } from "pinia";
import { setup } from "@storybook/vue3-vite";
import type { Preview } from "@storybook/vue3-vite";

// Import global CSS (Tailwind v4 + CSS variables for the dark theme)
import "../client/src/assets/main.css";

// Register Pinia on the global app instance once
setup((app) => {
	app.use(createPinia());
});

const preview: Preview = {
	decorators: [
		(story) => {
			// Fresh Pinia instance per story for full isolation
			setActivePinia(createPinia());
			return story();
		},
	],
	parameters: {
		backgrounds: {
			default: "sky",
			values: [
				{ name: "sky", value: "#07080f" },
				{ name: "surface", value: "#0d0f1a" },
				{ name: "light", value: "#ffffff" },
			],
		},
		viewport: {
			defaultViewport: "desktop",
			viewports: {
				desktop: {
					name: "Desktop (1280×800)",
					styles: { width: "1280px", height: "800px" },
				},
				tablet: {
					name: "Tablet (768×1024)",
					styles: { width: "768px", height: "1024px" },
				},
				mobile: {
					name: "Mobile (375×812)",
					styles: { width: "375px", height: "812px" },
				},
			},
		},
	},
};

export default preview;
