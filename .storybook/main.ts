import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/vue3-vite";
import type { Plugin } from "vite";
import { mergeConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const publicAssetPlugin: Plugin = {
	name: "storybook-public-asset-url",
	enforce: "post",
	transform(code, id) {
		// @vitejs/plugin-vue compiles <img src="/icon.svg"> into a JS module import.
		// In Storybook, staticDirs middleware intercepts the request and returns
		// image/svg+xml, which the browser rejects as a non-JS module → story fails.
		// Rewrite the generated absolute-path asset imports to URL-string constants
		// so no module fetch is needed and the img src still resolves correctly.
		if (!id.includes(".vue")) return;
		return code.replace(
			/\bimport (\w+) from "(\/[^"]+\.(?:svg|png|ico|gif|jpg|jpeg|webp|avif))"/g,
			(_, varName, url) => `const ${varName} = ${JSON.stringify(url)}`,
		);
	},
};

const config: StorybookConfig = {
	stories: ["../client/src/**/*.stories.ts"],
	staticDirs: ["../client/public"],
	framework: {
		name: "@storybook/vue3-vite",
		options: {
			docgen: "vue-docgen-api",
		},
	},
	viteFinal(config) {
		return mergeConfig(config, {
			root: resolve(__dirname, ".."),
			publicDir: resolve(__dirname, "../client/public"),
			resolve: {
				alias: { "@": resolve(__dirname, "../client/src") },
			},
			plugins: [tailwindcss(), publicAssetPlugin],
		});
	},
};

export default config;
