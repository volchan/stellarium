import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	DynamicDrawUsage,
	LineBasicMaterial,
	LineSegments,
	PerspectiveCamera,
	Points,
	Scene,
	ShaderMaterial,
	Vector3,
	WebGLRenderer,
} from "three";
import { bvToColor, jdToGMST, raDec_to_AltAz, zuluToJD } from "./astro";
import type { Constellation, Star } from "./catalog";

export interface AppState {
	constLines: boolean;
	constNames: boolean;
	starLabels: boolean;
mag: number;
	fov: number;
	telemetry: {
		lat: number;
		lon: number;
		alt: number;
		headingTrue: number;
		pitch: number;
		zuluTime: number;
	};
	camera: { az: number; alt: number };
}

export interface VisibleStar {
	star: Star;
	x: number;
	y: number;
	altAz: { alt: number; az: number };
}

export interface RendererHandle {
	starAt(mx: number, my: number): VisibleStar | null;
	setHovered(s: VisibleStar | null): void;
	setPinned(s: VisibleStar | null): void;
	dispose(): void;
}

// ── Shaders ─────────────────────────────────────────────

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute vec3  aColor;
varying   vec3  vColor;
void main() {
    vColor      = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core  = 1.0 - smoothstep(0.0, 0.32, d);
    float halo  = (1.0 - smoothstep(0.32, 1.0, d)) * 0.62;
    gl_FragColor = vec4(vColor, core + halo);
}
`;

const BG_VERT = /* glsl */ `
attribute float aSize;
attribute vec3  aColor;
attribute float aPhase;
attribute float aSpeed;
uniform   float uTime;
varying   vec3  vColor;
void main() {
    float tw     = 0.8 + sin(uTime * aSpeed + aPhase) * 0.2;
    vColor       = aColor * tw;
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * tw;
}
`;

const BG_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    gl_FragColor = vec4(vColor, (1.0 - d) * 0.9);
}
`;

// ── LCG (same seed / params as original) ────────────────

function lcg(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0;
		return s / 0x100000000;
	};
}

// ── Main export ──────────────────────────────────────────
// Three.js convention: Y-up, North = -Z, East = +X

export function initRenderer(
	canvas: HTMLCanvasElement,
	constLabelsEl: HTMLElement,
	getState: () => AppState,
	stars: Star[],
	constellations: Constellation[],
): RendererHandle {
	// biome-ignore lint/style/noNonNullAssertion: canvas is always inside sky-wrap
	const wrap = canvas.parentElement!;

	const three = new WebGLRenderer({ canvas, antialias: true, alpha: false });
	three.setPixelRatio(window.devicePixelRatio);
	three.setClearColor(0x07080f, 1);

	const scene = new Scene();
	const camera = new PerspectiveCamera(60, 1, 0.001, 200);

	// 2D overlay for hover ring, star labels, cardinals, reticle
	const overlay = document.createElement("canvas");
	overlay.style.cssText = "position:absolute;inset:0;pointer-events:none";
	wrap.appendChild(overlay);
	// biome-ignore lint/style/noNonNullAssertion: overlay canvas always supports 2d
	const ctx = overlay.getContext("2d")!;

	let W = 1;
	let H = 1;
	let dpr = window.devicePixelRatio || 1;

	function resize() {
		W = wrap.offsetWidth;
		H = wrap.offsetHeight;
		dpr = window.devicePixelRatio || 1;

		three.setSize(W, H);
		overlay.width = W * dpr;
		overlay.height = H * dpr;
		overlay.style.width = `${W}px`;
		overlay.style.height = `${H}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		camera.aspect = W / H;
		camera.updateProjectionMatrix();
	}

	window.addEventListener("resize", resize);
	resize();

	// ── Catalog stars ────────────────────────────────────

	// Pre-compute B-V colors (avoids per-frame string parsing)
	const preColors = new Float32Array(stars.length * 3);
	for (let i = 0; i < stars.length; i++) {
		const hex = bvToColor(stars[i].ci);
		preColors[i * 3] = Number.parseInt(hex.slice(1, 3), 16) / 255;
		preColors[i * 3 + 1] = Number.parseInt(hex.slice(3, 5), 16) / 255;
		preColors[i * 3 + 2] = Number.parseInt(hex.slice(5, 7), 16) / 255;
	}

	const cPosBuf = new Float32Array(stars.length * 3);
	const cColBuf = new Float32Array(stars.length * 3);
	const cSizBuf = new Float32Array(stars.length);

	const catGeo = new BufferGeometry();
	const cPosAttr = new BufferAttribute(cPosBuf, 3);
	const cColAttr = new BufferAttribute(cColBuf, 3);
	const cSizAttr = new BufferAttribute(cSizBuf, 1);
	cPosAttr.setUsage(DynamicDrawUsage);
	cColAttr.setUsage(DynamicDrawUsage);
	cSizAttr.setUsage(DynamicDrawUsage);
	catGeo.setAttribute("position", cPosAttr);
	catGeo.setAttribute("aColor", cColAttr);
	catGeo.setAttribute("aSize", cSizAttr);

	const catMat = new ShaderMaterial({
		vertexShader: STAR_VERT,
		fragmentShader: STAR_FRAG,
		transparent: true,
		depthTest: false,
		depthWrite: false,
		blending: AdditiveBlending,
	});

	scene.add(new Points(catGeo, catMat));

	// ── Background stars (static, seeded) ────────────────

	const BG_COUNT = 1900;
	const bgRng = lcg(0xcafebabe);
	const bgPosBuf = new Float32Array(BG_COUNT * 3);
	const bgColBuf = new Float32Array(BG_COUNT * 3);
	const bgSizBuf = new Float32Array(BG_COUNT);
	const bgPhaBuf = new Float32Array(BG_COUNT);
	const bgSpdBuf = new Float32Array(BG_COUNT);

	for (let i = 0; i < BG_COUNT; i++) {
		const mag = bgRng() ** 0.4 * 6.5;
		const ci = bgRng() * 3 - 0.5;

		// Uniform distribution on sphere
		const theta = 2 * Math.PI * bgRng();
		const phi = Math.acos(2 * bgRng() - 1);
		bgPosBuf[i * 3] = 50 * Math.sin(phi) * Math.cos(theta);
		bgPosBuf[i * 3 + 1] = 50 * Math.cos(phi);
		bgPosBuf[i * 3 + 2] = 50 * Math.sin(phi) * Math.sin(theta);

		const hex = bvToColor(ci);
		const alpha = 0.25 + (1 - mag / 6.5) * 0.72;
		bgColBuf[i * 3] = (Number.parseInt(hex.slice(1, 3), 16) / 255) * alpha;
		bgColBuf[i * 3 + 1] = (Number.parseInt(hex.slice(3, 5), 16) / 255) * alpha;
		bgColBuf[i * 3 + 2] = (Number.parseInt(hex.slice(5, 7), 16) / 255) * alpha;

		bgSizBuf[i] = Math.max(0.8, ((6.5 - mag) / 6.5) * 2.4);
		bgPhaBuf[i] = bgRng() * Math.PI * 2;
		bgSpdBuf[i] = 0.006 + bgRng() * 0.028;
	}

	const bgGeo = new BufferGeometry();
	bgGeo.setAttribute("position", new BufferAttribute(bgPosBuf, 3));
	bgGeo.setAttribute("aColor", new BufferAttribute(bgColBuf, 3));
	bgGeo.setAttribute("aSize", new BufferAttribute(bgSizBuf, 1));
	bgGeo.setAttribute("aPhase", new BufferAttribute(bgPhaBuf, 1));
	bgGeo.setAttribute("aSpeed", new BufferAttribute(bgSpdBuf, 1));

	const bgMat = new ShaderMaterial({
		uniforms: { uTime: { value: 0 } },
		vertexShader: BG_VERT,
		fragmentShader: BG_FRAG,
		transparent: true,
		depthTest: false,
		depthWrite: false,
		blending: AdditiveBlending,
	});

	scene.add(new Points(bgGeo, bgMat));

	// ── Constellation lines ──────────────────────────────

	let maxLnVerts = 0;
	for (const c of constellations) maxLnVerts += c.lines.length * 2;

	const lnPosBuf = new Float32Array(maxLnVerts * 3);
	const lnGeo = new BufferGeometry();
	const lnPosAttr = new BufferAttribute(lnPosBuf, 3);
	lnPosAttr.setUsage(DynamicDrawUsage);
	lnGeo.setAttribute("position", lnPosAttr);

	const lnMat = new LineBasicMaterial({
		color: 0x5082dc,
		transparent: true,
		opacity: 0.38,
		depthTest: false,
		depthWrite: false,
	});

	const constLinesObj = new LineSegments(lnGeo, lnMat);
	scene.add(constLinesObj);

	// ── State ────────────────────────────────────────────

	let visibleStars: VisibleStar[] = [];
	let hoveredStar: VisibleStar | null = null;
	let pinnedStar: VisibleStar | null = null;

	// Reusable vectors — avoids per-frame allocation
	const _look = new Vector3();
	const _proj = new Vector3();
	const _sc = { x: 0, y: 0 };

	// hipToIdx: maps HIP id → current frame buffer index (filled each render)
	const hipToIdx = new Map<number, number>();

	// Per-frame visible star cache — pre-allocated to avoid GC churn
	const _visAlt = new Float32Array(stars.length);
	const _visAz = new Float32Array(stars.length);
	const _visStar = new Array<Star>(stars.length);

	function project(bx: number, by: number, bz: number, out: { x: number; y: number }): boolean {
		_proj.set(bx, by, bz).project(camera);
		if (_proj.z >= 1.0) return false;
		out.x = (_proj.x + 1) * W * 0.5;
		out.y = (1 - _proj.y) * H * 0.5;
		return true;
	}

	// ── Overlay drawing ──────────────────────────────────

	function drawHoverRing(t: number) {
		const sel = pinnedStar ?? hoveredStar;
		if (!sel) return;

		const pulse = 0.5 + Math.sin(t * 0.0025) * 0.32;
		const ar = (sel.altAz.alt * Math.PI) / 180;
		const azr = (sel.altAz.az * Math.PI) / 180;
		if (!project(Math.cos(ar) * Math.sin(azr), Math.sin(ar), -Math.cos(ar) * Math.cos(azr), _sc))
			return;

		ctx.save();
		ctx.strokeStyle = `rgba(74,158,255,${pulse})`;
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 5]);
		ctx.beginPath();
		ctx.arc(_sc.x, _sc.y, 16, 0, 6.2832);
		ctx.stroke();
		ctx.restore();
	}

	function drawStarLabels(state: AppState) {
		if (!state.starLabels) return;
		ctx.save();
		ctx.font = "10px ui-monospace,monospace";
		ctx.fillStyle = "rgba(155,185,240,0.58)";
		for (const vs of visibleStars) {
			if (vs.star.mag < 1.6 && vs.star.proper) {
				ctx.fillText(vs.star.proper, vs.x + 7, vs.y - 4);
			}
		}
		ctx.restore();
	}

	function drawGround() {
		const N = 180;
		const arc: { x: number; y: number }[] = [];
		for (let i = 0; i < N; i++) {
			const azr = (i / N) * 2 * Math.PI;
			if (project(Math.sin(azr), 0, -Math.cos(azr), _sc)) {
				arc.push({ x: _sc.x, y: _sc.y });
			}
		}

		ctx.save();
		ctx.setLineDash([]);

		if (arc.length < 2) {
			// Check if zenith is behind camera (looking straight down)
			project(0, 1, 0, _sc);
			if (_proj.z >= 1.0) {
				ctx.fillStyle = "rgba(8, 13, 9, 0.96)";
				ctx.fillRect(0, 0, W, H);
			}
			ctx.restore();
			return;
		}

		arc.sort((a, b) => a.x - b.x);
		const yMid = arc[arc.length >> 1].y;

		const grad = ctx.createLinearGradient(0, yMid - 6, 0, yMid + 70);
		grad.addColorStop(0, "rgba(8, 13, 9, 0)");
		grad.addColorStop(0.22, "rgba(8, 13, 9, 0.72)");
		grad.addColorStop(1, "rgba(8, 13, 9, 0.97)");

		ctx.beginPath();
		ctx.moveTo(-2, arc[0].y);
		for (const p of arc) ctx.lineTo(p.x, p.y);
		ctx.lineTo(W + 2, arc[arc.length - 1].y);
		ctx.lineTo(W + 2, H + 2);
		ctx.lineTo(-2, H + 2);
		ctx.closePath();
		ctx.fillStyle = grad;
		ctx.fill();

		// Atmospheric horizon glow
		ctx.beginPath();
		ctx.moveTo(-2, arc[0].y);
		for (const p of arc) ctx.lineTo(p.x, p.y);
		ctx.lineTo(W + 2, arc[arc.length - 1].y);
		ctx.strokeStyle = "rgba(50, 120, 210, 0.22)";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		ctx.restore();
	}

	function drawCardinals() {
		const DIRS: [string, number, number][] = [
			["N", 0, 0],
			["S", 180, 0],
			["E", 90, 0],
			["W", 270, 0],
		];
		ctx.save();
		ctx.font = "9px ui-monospace,monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "rgba(90,101,133,0.36)";

		for (const [label, az, alt] of DIRS) {
			const ar = (alt * Math.PI) / 180;
			const azr = (az * Math.PI) / 180;
			if (project(Math.cos(ar) * Math.sin(azr), Math.sin(ar), -Math.cos(ar) * Math.cos(azr), _sc)) {
				const pad = 16;
				ctx.fillText(
					label,
					Math.max(pad, Math.min(W - pad, _sc.x)),
					Math.max(pad, Math.min(H - pad, _sc.y)),
				);
			}
		}

		// Center reticle
		const cx = W / 2;
		const cy = H / 2;
		ctx.strokeStyle = "rgba(74,158,255,0.055)";
		ctx.lineWidth = 1;
		ctx.setLineDash([]);
		for (const [x1, y1, x2, y2] of [
			[cx - 22, cy, cx - 9, cy],
			[cx + 9, cy, cx + 22, cy],
			[cx, cy - 22, cx, cy - 9],
			[cx, cy + 9, cx, cy + 22],
		]) {
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}

		ctx.restore();
	}

	function rebuildConstLabels(state: AppState) {
		if (!state.constNames) {
			constLabelsEl.innerHTML = "";
			return;
		}

		constLabelsEl.innerHTML = "";
		const sc1 = { x: 0, y: 0 };
		const sc2 = { x: 0, y: 0 };

		for (const c of constellations) {
			const xs: number[] = [];
			const ys: number[] = [];

			for (const [h1, h2] of c.lines) {
				const i1 = hipToIdx.get(h1);
				const i2 = hipToIdx.get(h2);
				if (
					i1 !== undefined &&
					project(cPosBuf[i1 * 3], cPosBuf[i1 * 3 + 1], cPosBuf[i1 * 3 + 2], sc1)
				) {
					xs.push(sc1.x);
					ys.push(sc1.y);
				}
				if (
					i2 !== undefined &&
					project(cPosBuf[i2 * 3], cPosBuf[i2 * 3 + 1], cPosBuf[i2 * 3 + 2], sc2)
				) {
					xs.push(sc2.x);
					ys.push(sc2.y);
				}
			}
			if (xs.length === 0) continue;

			const lx = xs.reduce((a, b) => a + b, 0) / xs.length;
			const ly = ys.reduce((a, b) => a + b, 0) / ys.length;
			if (lx < 0 || lx > W || ly < 0 || ly > H) continue;

			const d = document.createElement("div");
			d.className = "const-label";
			d.textContent = c.name.toUpperCase();
			d.style.left = `${lx}px`;
			d.style.top = `${ly}px`;
			constLabelsEl.appendChild(d);
		}
	}

	// ── Render loop ──────────────────────────────────────

	function render(t: number) {
		const state = getState();

		// Camera
		const hFovRad = (state.fov * Math.PI) / 180;
		camera.fov = (2 * Math.atan(Math.tan(hFovRad / 2) * (H / W)) * 180) / Math.PI;
		camera.aspect = W / H;
		camera.updateProjectionMatrix();

		const camAr = (state.camera.alt * Math.PI) / 180;
		const camAzr = (state.camera.az * Math.PI) / 180;
		_look.set(
			Math.cos(camAr) * Math.sin(camAzr),
			Math.sin(camAr),
			-Math.cos(camAr) * Math.cos(camAzr),
		);
		camera.lookAt(_look);

		// Time / position
		const jd = zuluToJD(state.telemetry.zuluTime);
		const gmst = jdToGMST(jd);
		const { lat, lon } = state.telemetry;

		// Build catalog star geometry
		let count = 0;
		hipToIdx.clear();

		for (let si = 0; si < stars.length; si++) {
			const star = stars[si];
			if (star.mag > state.mag) continue;

			const altAz = raDec_to_AltAz(star.ra, star.dec, lat, lon, gmst);
			if (altAz.alt < -5) continue;

			const ar = (altAz.alt * Math.PI) / 180;
			const azr = (altAz.az * Math.PI) / 180;
			cPosBuf[count * 3] = Math.cos(ar) * Math.sin(azr);
			cPosBuf[count * 3 + 1] = Math.sin(ar);
			cPosBuf[count * 3 + 2] = -Math.cos(ar) * Math.cos(azr);

			cColBuf[count * 3] = preColors[si * 3];
			cColBuf[count * 3 + 1] = preColors[si * 3 + 1];
			cColBuf[count * 3 + 2] = preColors[si * 3 + 2];

			// Logarithmic size: dramatic range from faint to bright
			const norm = Math.max(0, (state.mag - star.mag) / state.mag);
			const tw = 0.93 + Math.sin(t * 0.013 + star.id * 0.85) * 0.07;
			cSizBuf[count] = dpr * Math.min(32, (3 + 18 * norm ** 1.6) * tw);

			if (star.hip) hipToIdx.set(star.hip, count);
			_visAlt[count] = altAz.alt;
			_visAz[count] = altAz.az;
			_visStar[count] = star;
			count++;
		}

		catGeo.setDrawRange(0, count);
		cPosAttr.needsUpdate = true;
		cColAttr.needsUpdate = true;
		cSizAttr.needsUpdate = true;

		// Constellation lines
		constLinesObj.visible = state.constLines;
		if (state.constLines) {
			let lnCount = 0;
			for (const c of constellations) {
				for (const [h1, h2] of c.lines) {
					const i1 = hipToIdx.get(h1);
					const i2 = hipToIdx.get(h2);
					if (i1 === undefined || i2 === undefined) continue;
					lnPosBuf[lnCount * 3] = cPosBuf[i1 * 3];
					lnPosBuf[lnCount * 3 + 1] = cPosBuf[i1 * 3 + 1];
					lnPosBuf[lnCount * 3 + 2] = cPosBuf[i1 * 3 + 2];
					lnPosBuf[(lnCount + 1) * 3] = cPosBuf[i2 * 3];
					lnPosBuf[(lnCount + 1) * 3 + 1] = cPosBuf[i2 * 3 + 1];
					lnPosBuf[(lnCount + 1) * 3 + 2] = cPosBuf[i2 * 3 + 2];
					lnCount += 2;
				}
			}
			lnGeo.setDrawRange(0, lnCount);
			lnPosAttr.needsUpdate = true;
		}

		// Background stars twinkling (time in ms, same scale as original)
		bgMat.uniforms.uTime.value = t;

		// Render 3D scene
		three.render(scene, camera);

		// Screen positions from cached first-pass data (no AltAz recompute)
		const newVisible: VisibleStar[] = [];
		{
			const sc = { x: 0, y: 0 };
			for (let vi = 0; vi < count; vi++) {
				if (project(cPosBuf[vi * 3], cPosBuf[vi * 3 + 1], cPosBuf[vi * 3 + 2], sc)) {
					if (sc.x > -20 && sc.x < W + 20 && sc.y > -20 && sc.y < H + 20) {
						newVisible.push({
							star: _visStar[vi],
							x: sc.x,
							y: sc.y,
							altAz: { alt: _visAlt[vi], az: _visAz[vi] },
						});
					}
				}
			}
		}
		visibleStars = newVisible;

		// 2D overlay
		ctx.clearRect(0, 0, W, H);
		drawGround();
		drawHoverRing(t);
		drawStarLabels(state);
		drawCardinals();
		rebuildConstLabels(state);
	}

	three.setAnimationLoop(render);

	return {
		starAt(mx, my) {
			let best: VisibleStar | null = null;
			let bd = 18;
			for (const s of visibleStars) {
				const d = Math.hypot(mx - s.x, my - s.y);
				if (d < bd) {
					bd = d;
					best = s;
				}
			}
			return best;
		},
		setHovered(s) {
			hoveredStar = s;
		},
		setPinned(s) {
			pinnedStar = s;
		},
		dispose() {
			three.setAnimationLoop(null);
			three.dispose();
			window.removeEventListener("resize", resize);
			overlay.remove();
		},
	};
}
