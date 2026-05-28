import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const serveData = {
	name: "serve-catalog-data",
	configureServer(server: import("vite").ViteDevServer) {
		server.middlewares.use("/data", (req, res, next) => {
			const file = resolve(__dirname, "dist/data", (req.url ?? "").replace(/^\//, ""));
			if (existsSync(file)) {
				res.setHeader("Content-Type", "application/json");
				createReadStream(file).pipe(res);
			} else {
				next();
			}
		});
	},
};

export default defineConfig({
	plugins: [vue(), tailwindcss(), serveData],
	root: "src",
	resolve: {
		alias: { "@": resolve(__dirname, "src/src") },
	},
	build: {
		outDir: "../dist",
		emptyOutDir: false,
	},
});
