import { resolve } from "node:path";

const DIST = resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT ?? 3000);

export default {
	port,
	hostname: "0.0.0.0",
	async fetch(req: Request) {
		const url = new URL(req.url);
		const path = url.pathname === "/" ? "/index.html" : url.pathname;
		const file = Bun.file(`${DIST}${path}`);
		if (await file.exists()) return new Response(file);
		return new Response(Bun.file(`${DIST}/index.html`));
	},
};

console.log(`Planetarium running at http://0.0.0.0:${port}`);
