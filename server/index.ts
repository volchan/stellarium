import { resolve } from "node:path";

const DIST = resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT ?? 3000);

const SECURITY_HEADERS = {
	"Content-Security-Policy": [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://aladin.cds.unistra.fr",
		"style-src 'self' 'unsafe-inline' https://aladin.cds.unistra.fr",
		"img-src 'self' data: blob: https://*.unistra.fr https://*.u-strasbg.fr https://alasky.cds.unistra.fr https://irsa.ipac.caltech.edu",
		"connect-src 'self' data: https://*.unistra.fr https://*.u-strasbg.fr https://alasky.cds.unistra.fr https://irsa.ipac.caltech.edu https://simbad.u-strasbg.fr https://simbad.cds.unistra.fr https://raw.githubusercontent.com",
		"font-src 'self'",
		"frame-src 'none'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; "),
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"X-XSS-Protection": "0",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=()",
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Resource-Policy": "same-origin",
};

function secureHeaders(res: Response): Response {
	const headers = new Headers(res.headers);
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
	return new Response(res.body, { status: res.status, headers });
}

function isPathSafe(pathname: string): boolean {
	const decoded = decodeURIComponent(pathname);
	return !decoded.includes("..") && !decoded.includes("\0");
}

export default {
	port,
	hostname: "0.0.0.0",
	async fetch(req: Request) {
		const url = new URL(req.url);

		if (req.method !== "GET" && req.method !== "HEAD") {
			return secureHeaders(new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } }));
		}

		if (!isPathSafe(url.pathname)) {
			return secureHeaders(new Response(null, { status: 400 }));
		}

		const path = url.pathname === "/" ? "/index.html" : url.pathname;
		const file = Bun.file(`${DIST}${path}`);

		if (await file.exists()) {
			return secureHeaders(new Response(file));
		}

		return secureHeaders(new Response(Bun.file(`${DIST}/index.html`)));
	},
};
