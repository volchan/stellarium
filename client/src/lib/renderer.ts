import {
	AdditiveBlending,
	BackSide,
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	ClampToEdgeWrapping,
	DynamicDrawUsage,
	LineBasicMaterial,
	LineSegments,
	LinearFilter,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	RepeatWrapping,
	Scene,
	ShaderMaterial,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from "three";
import {
	bvToColor,
	computePlanets,
	jdToGMST,
	moonDistanceKm,
	moonPhase,
	moonRaDec,
	raDec_to_AltAz,
	sunDistanceAU,
	sunRaDec,
	zuluToJD,
} from "./astro";
import type { Constellation, Star } from "./catalog";

export interface AppState {
	constLines: boolean;
	constNames: boolean;
	starLabels: boolean;
	mag: number;
	fov: number;
	showSun: boolean;
	showMoon: boolean;
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

	// ── Planets (7 slots, updated each frame) ────────────

	const PL_MAX = 7;
	const plPosBuf = new Float32Array(PL_MAX * 3);
	const plColBuf = new Float32Array(PL_MAX * 3);
	const plSizBuf = new Float32Array(PL_MAX);

	const plGeo = new BufferGeometry();
	const plPosAttr = new BufferAttribute(plPosBuf, 3);
	const plColAttr = new BufferAttribute(plColBuf, 3);
	const plSizAttr = new BufferAttribute(plSizBuf, 1);
	plPosAttr.setUsage(DynamicDrawUsage);
	plColAttr.setUsage(DynamicDrawUsage);
	plSizAttr.setUsage(DynamicDrawUsage);
	plGeo.setAttribute("position", plPosAttr);
	plGeo.setAttribute("aColor",   plColAttr);
	plGeo.setAttribute("aSize",    plSizAttr);

	const plMat = new ShaderMaterial({
		vertexShader: STAR_VERT,
		fragmentShader: STAR_FRAG,
		transparent: true,
		depthTest: false,
		depthWrite: false,
		blending: AdditiveBlending,
	});

	scene.add(new Points(plGeo, plMat));

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

	const bgStars = new Points(bgGeo, bgMat);
	scene.add(bgStars);

	// ── Milky Way skybox (real NASA imagery, real coordinates) ───
	// A large sphere textured with NASA/SVS "Deep Star Maps 2020" — a real
	// photographic Milky Way panorama, equirectangular in celestial (RA/Dec)
	// coordinates. The sphere's local frame IS the equatorial frame (texture
	// column = RA, row = Dec); every frame we re-orient the whole mesh into
	// the horizontal (Alt/Az) frame using the same raDec_to_AltAz pipeline
	// the stars use, so the image rotates with sidereal time and shifts with
	// observer lat/lon for real, exactly like the actual sky would.

	const MW_RADIUS = 90;

	// The source JPEG (NASA/SVS "Deep Star Maps 2020", 8K EXR re-tonemapped and
	// downsampled to 4096×2048 — see scripts/README or commit history for the
	// ffmpeg pipeline) is drawn through an offscreen canvas for a light blur
	// that smooths JPEG blocking once magnified by a narrow FOV.
	const mwCanvas = document.createElement("canvas");
	mwCanvas.width = 4096;
	mwCanvas.height = 2048;
	// biome-ignore lint/style/noNonNullAssertion: canvas 2d context always available
	const mwCtx = mwCanvas.getContext("2d")!;
	const mwTexture = new CanvasTexture(mwCanvas);
	mwTexture.colorSpace = SRGBColorSpace;
	mwTexture.wrapS = RepeatWrapping;
	mwTexture.wrapT = ClampToEdgeWrapping;
	mwTexture.flipY = false; // uv.v=0 → image row 0 (top) directly, no implicit flip
	mwTexture.generateMipmaps = false;
	mwTexture.minFilter = LinearFilter;

	const mwImg = new Image();
	mwImg.onload = () => {
		mwCtx.filter = "blur(1.5px) brightness(1.5) saturate(1.2)";
		mwCtx.drawImage(mwImg, 0, 0, mwCanvas.width, mwCanvas.height);
		mwTexture.needsUpdate = true;
	};
	mwImg.onerror = () => {
		console.error(`Failed to load Milky Way texture from ${mwImg.src}`);
	};
	mwImg.src = "/textures/milkyway.jpg";

	// Custom UV-sphere built directly in the equatorial frame: local X = (RA=0,Dec=0),
	// local Y = (RA=6h,Dec=0), local Z = celestial pole (Dec=90). uv.u = RA/24 (image
	// left edge = RA 0h), uv.v = (90-Dec)/180 (image top row = Dec +90). Building the
	// geometry ourselves (instead of relying on SphereGeometry's internal UV formula)
	// keeps the RA/Dec ↔ pixel mapping fully explicit and easy to calibrate/flip.
	// Declination is clamped just short of ±90° to avoid the pole vertex fan (a
	// mipmap/degenerate-triangle "starburst" artifact) — leaves a tiny, invisible
	// unrendered cap right at the celestial poles.
	const MW_WSEG = 96;
	const MW_HSEG = 48;
	const MW_DEC_CLAMP = 89;
	const MW_FADE_DEG = 40; // feather width blending the polar cutoff into the sky

	function buildMwGeometry(): BufferGeometry {
		const positions: number[] = [];
		const uvs: number[] = [];
		const colors: number[] = [];
		const indices: number[] = [];
		const fadeStart = MW_DEC_CLAMP - MW_FADE_DEG;

		for (let iy = 0; iy <= MW_HSEG; iy++) {
			const v = iy / MW_HSEG;
			const decDeg = MW_DEC_CLAMP - v * (2 * MW_DEC_CLAMP);
			const decR = (decDeg * Math.PI) / 180;
			const absDec = Math.abs(decDeg);
			const brightness =
				absDec <= fadeStart ? 1 : Math.max(0, 1 - (absDec - fadeStart) / MW_FADE_DEG);
			for (let ix = 0; ix <= MW_WSEG; ix++) {
				const u = ix / MW_WSEG;
				const raR = u * 2 * Math.PI; // RA in radians (u=0 → RA=0h, u=1 → RA=24h)
				positions.push(
					MW_RADIUS * Math.cos(decR) * Math.cos(raR),
					MW_RADIUS * Math.cos(decR) * Math.sin(raR),
					MW_RADIUS * Math.sin(decR),
				);
				uvs.push(u, (90 - decDeg) / 180);
				colors.push(brightness, brightness, brightness);
			}
		}

		for (let iy = 0; iy < MW_HSEG; iy++) {
			for (let ix = 0; ix < MW_WSEG; ix++) {
				const a = iy * (MW_WSEG + 1) + ix;
				const b = a + MW_WSEG + 1;
				indices.push(a, b, a + 1, b, b + 1, a + 1);
			}
		}

		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
		geo.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
		geo.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
		geo.setIndex(indices);
		return geo;
	}

	const mwGeo = buildMwGeometry();

	const mwMat = new MeshBasicMaterial({
		map: mwTexture,
		vertexColors: true,
		side: BackSide,
		depthTest: false,
		depthWrite: false,
		toneMapped: false,
	});
	const mwMesh = new Mesh(mwGeo, mwMat);
	scene.add(mwMesh);

	// Renderer-space direction for an equatorial (RA/Dec) coordinate — same
	// alt/az → xyz convention used everywhere else (Y-up, North=-Z, East=+X).
	function eqDirToRenderVec(raH: number, decDeg: number, lat: number, lon: number, gmst: number) {
		const altAz = raDec_to_AltAz(raH, decDeg, lat, lon, gmst);
		const ar = (altAz.alt * Math.PI) / 180;
		const azr = (altAz.az * Math.PI) / 180;
		return new Vector3(Math.cos(ar) * Math.sin(azr), Math.sin(ar), -Math.cos(ar) * Math.cos(azr));
	}

	const _mwBasis = new Matrix4();

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

	function drawHoverRing(t: number, lat: number, lon: number, gmst: number) {
		const sel = pinnedStar ?? hoveredStar;
		if (!sel) return;

		const pulse = 0.5 + Math.sin(t * 0.0025) * 0.32;

		// Solar bodies use live RA/Dec (computed each frame); catalog stars have fixed RA/Dec
		const live = sel.star.id < 0 ? _liveRaDec.get(sel.star.id) : undefined;
		const { ra, dec } = live ?? sel.star;
		const aa = raDec_to_AltAz(ra, dec, lat, lon, gmst);

		const ar  = (aa.alt * Math.PI) / 180;
		const azr = (aa.az  * Math.PI) / 180;
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

	// Sun/Moon positions, updated each frame
	let _sunAlt = -90;
	let _sunAz  = 0;
	let _moonAlt = -90;
	let _moonAz  = 0;
	let _moonPhaseVal = 0;

	// Live RA/Dec for solar bodies (id → {ra, dec}), refreshed each frame so the
	// hover ring tracks moving objects instead of using stale click-time coordinates.
	const _liveRaDec = new Map<number, { ra: number; dec: number }>();

	function drawGround(sunAlt: number) {
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
		grad.addColorStop(0.22, "rgba(8, 13, 9, 0.82)");
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

		// Horizon line colour shifts with twilight
		const horizColor = sunAlt > 0
			? "rgba(140,180,255,0.35)"
			: sunAlt > -6
				? "rgba(255,120,50,0.4)"
				: "rgba(50,120,210,0.22)";

		ctx.beginPath();
		ctx.moveTo(-2, arc[0].y);
		for (const p of arc) ctx.lineTo(p.x, p.y);
		ctx.lineTo(W + 2, arc[arc.length - 1].y);
		ctx.strokeStyle = horizColor;
		ctx.lineWidth = 1.5;
		ctx.stroke();

		ctx.restore();
	}

	function drawSun(state: AppState) {
		if (!state.showSun || _sunAlt < -0.8) return;
		const altR = (_sunAlt * Math.PI) / 180;
		const azR  = (_sunAz  * Math.PI) / 180;
		if (!project(Math.cos(altR) * Math.sin(azR), Math.sin(altR), -Math.cos(altR) * Math.cos(azR), _sc)) return;

		const { x, y } = _sc;
		ctx.save();

		// Outer corona
		const corona = ctx.createRadialGradient(x, y, 0, x, y, 90);
		corona.addColorStop(0,   "rgba(255,255,220,0.14)");
		corona.addColorStop(1,   "rgba(255,255,220,0)");
		ctx.fillStyle = corona;
		ctx.beginPath(); ctx.arc(x, y, 90, 0, 6.2832); ctx.fill();

		// Mid glare
		const glare = ctx.createRadialGradient(x, y, 0, x, y, 42);
		glare.addColorStop(0,   "rgba(255,255,200,0.28)");
		glare.addColorStop(1,   "rgba(255,255,200,0)");
		ctx.fillStyle = glare;
		ctx.beginPath(); ctx.arc(x, y, 42, 0, 6.2832); ctx.fill();

		// Disc
		ctx.fillStyle = _sunAlt > 5 ? "#FFF8E8" : "#FFD080";
		ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.2832); ctx.fill();

		ctx.restore();
	}

	function drawMoon(state: AppState) {
		if (!state.showMoon || _moonAlt < -0.8) return;
		const altR = (_moonAlt * Math.PI) / 180;
		const azR  = (_moonAz  * Math.PI) / 180;
		if (!project(Math.cos(altR) * Math.sin(azR), Math.sin(altR), -Math.cos(altR) * Math.cos(azR), _sc)) return;

		const { x, y } = _sc;
		const R = 11;
		ctx.save();

		// Subtle glow
		const glow = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
		glow.addColorStop(0,   "rgba(220,215,200,0.18)");
		glow.addColorStop(1,   "rgba(220,215,200,0)");
		ctx.fillStyle = glow;
		ctx.beginPath(); ctx.arc(x, y, R * 2.4, 0, 6.2832); ctx.fill();

		// Full disc
		ctx.fillStyle = "#D8D0C0";
		ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.fill();

		// Phase shadow mask
		// phase: 0=new(dark), 0.5=full(bright), 1=new again
		// illuminated fraction goes 0→1→0 as phase 0→0.5→1
		const phase = _moonPhaseVal;   // 0–1
		const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2; // 0=new, 1=full

		ctx.globalCompositeOperation = "source-atop";

		// Clip to moon disc
		ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.clip();

		// Dark side: always fill the half that faces away from Sun
		// For waxing (phase<0.5): dark on left, light on right → ellipse x-radius lerps R→0
		// For waning (phase>0.5): dark on right, light on left → same but mirrored
		const waxing = phase < 0.5;
		const terminatorX = waxing
			? R - illum * 2 * R   // from full-dark (R) to full-light (−R) as illum 0→1
			: illum * 2 * R - R;  // from full-light to full-dark

		// Dark fill: the appropriate half
		ctx.fillStyle = "rgba(0,0,0,0.88)";
		if (waxing) {
			// dark left half
			ctx.fillRect(x - R, y - R, R, R * 2);
			// terminator ellipse to blend the edge
			ctx.beginPath();
			ctx.ellipse(x, y, Math.abs(terminatorX), R, 0, Math.PI / 2, -Math.PI / 2);
			ctx.fill();
		} else {
			// dark right half
			ctx.fillRect(x, y - R, R, R * 2);
			ctx.beginPath();
			ctx.ellipse(x, y, Math.abs(terminatorX), R, 0, -Math.PI / 2, Math.PI / 2);
			ctx.fill();
		}

		ctx.globalCompositeOperation = "source-over";
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

		// Sun + Moon positions
		const sunRD   = sunRaDec(jd);
		const sunAltAz = raDec_to_AltAz(sunRD.ra, sunRD.dec, lat, lon, gmst);
		_sunAlt = sunAltAz.alt;
		_sunAz  = sunAltAz.az;

		const moonRD  = moonRaDec(jd);
		const moonAltAz = raDec_to_AltAz(moonRD.ra, moonRD.dec, lat, lon, gmst);
		_moonAlt = moonAltAz.alt;
		_moonAz  = moonAltAz.az;
		_moonPhaseVal = moonPhase(jd);

		// Keep live RA/Dec for solar bodies so the hover ring tracks motion
		_liveRaDec.set(-1, sunRD);
		_liveRaDec.set(-2, moonRD);

		// Milky Way skybox — rotate the whole textured sphere from the equatorial
		// frame into Alt/Az using 3 reference directions run through the exact
		// same raDec_to_AltAz used for every star.
		{
			const e1 = eqDirToRenderVec(0, 0, lat, lon, gmst);
			const e2 = eqDirToRenderVec(6, 0, lat, lon, gmst);
			// raDec_to_AltAz is a proper rotation, so it preserves cross products —
			// deriving e3 this way (rather than sampling near the pole) guarantees
			// an exactly orthonormal basis with no floating-point shear.
			const e3 = e1.clone().cross(e2).normalize();
			_mwBasis.makeBasis(e1, e2, e3);
			mwMesh.quaternion.setFromRotationMatrix(_mwBasis);
		}

		const effMag = state.mag;

		// Build catalog star geometry
		let count = 0;
		hipToIdx.clear();

		for (let si = 0; si < stars.length; si++) {
			const star = stars[si];
			if (star.id === 0) continue; // Sol — catalog entry for our Sun, rendered separately
			if (star.mag > effMag) continue;

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

			const norm = Math.min(1, Math.max(0, (state.mag - star.mag) / 8));
			const tw = 0.93 + Math.sin(t * 0.013 + star.id * 0.85) * 0.07;
			cSizBuf[count] = dpr * Math.min(12, (1.5 + 9 * norm ** 1.4) * tw);

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

		// Planets — geometry must be updated before three.render()
		const planets = computePlanets(jd);
		let plCount = 0;
		for (const pl of planets) {
			const altAz = raDec_to_AltAz(pl.ra, pl.dec, lat, lon, gmst);
			if (altAz.alt < -0.8) continue;
			if (pl.mag > state.mag) continue;

			const altR = (altAz.alt * Math.PI) / 180;
			const azR  = (altAz.az  * Math.PI) / 180;
			plPosBuf[plCount * 3]     = Math.cos(altR) * Math.sin(azR);
			plPosBuf[plCount * 3 + 1] = Math.sin(altR);
			plPosBuf[plCount * 3 + 2] = -Math.cos(altR) * Math.cos(azR);

			const hex = bvToColor(pl.ci);
			plColBuf[plCount * 3]     = Number.parseInt(hex.slice(1, 3), 16) / 255;
			plColBuf[plCount * 3 + 1] = Number.parseInt(hex.slice(3, 5), 16) / 255;
			plColBuf[plCount * 3 + 2] = Number.parseInt(hex.slice(5, 7), 16) / 255;

			const norm = Math.min(1, Math.max(0, (state.mag - pl.mag) / 8));
			plSizBuf[plCount] = dpr * Math.min(12, 1.5 + 9 * norm ** 1.4);

			_liveRaDec.set(pl.id, { ra: pl.ra, dec: pl.dec });
			plCount++;
		}
		plGeo.setDrawRange(0, plCount);
		plPosAttr.needsUpdate = true;
		plColAttr.needsUpdate = true;
		plSizAttr.needsUpdate = true;

		// Background stars twinkling (time in ms, same scale as original)
		bgMat.uniforms.uTime.value = t;

		// Render 3D scene
		three.render(scene, camera);

		// Screen positions for hit detection (uses already-computed buffer positions)
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
		// Planet screen positions for hit detection
		{
			let pi = 0;
			for (const pl of planets) {
				const altAz = raDec_to_AltAz(pl.ra, pl.dec, lat, lon, gmst);
				if (altAz.alt < -0.8 || pl.mag > state.mag) continue;
				const bx = plPosBuf[pi * 3];
				const by = plPosBuf[pi * 3 + 1];
				const bz = plPosBuf[pi * 3 + 2];
				if (project(bx, by, bz, _sc)) {
					newVisible.push({
						star: { id: pl.id, hip: pl.id, ra: pl.ra, dec: pl.dec, mag: pl.mag, proper: pl.name, ci: pl.ci, phase: pl.phase, distAU: pl.distAU },
						x: _sc.x, y: _sc.y,
						altAz,
					});
				}
				pi++;
			}
		}

		// Sun and Moon as clickable entries
		if (state.showSun && _sunAlt > -0.8) {
			const altR = (_sunAlt * Math.PI) / 180;
			const azR  = (_sunAz  * Math.PI) / 180;
			if (project(Math.cos(altR) * Math.sin(azR), Math.sin(altR), -Math.cos(altR) * Math.cos(azR), _sc)) {
				newVisible.push({ star: { id: -1, hip: -1, ra: sunRD.ra, dec: sunRD.dec, mag: -26.74, proper: "Sun", spect: "G2V", ci: 0.63, distAU: sunDistanceAU(jd) }, x: _sc.x, y: _sc.y, altAz: { alt: _sunAlt, az: _sunAz } });
			}
		}
		if (state.showMoon && _moonAlt > -0.8) {
			const altR = (_moonAlt * Math.PI) / 180;
			const azR  = (_moonAz  * Math.PI) / 180;
			if (project(Math.cos(altR) * Math.sin(azR), Math.sin(altR), -Math.cos(altR) * Math.cos(azR), _sc)) {
				const moonIllum = _moonPhaseVal;
				const moonMag = -12.74 + 2.5 * Math.log10(1 / Math.max(0.001, moonIllum));
				const moonDistAU = moonDistanceKm(jd) / 149597870.7;
				newVisible.push({ star: { id: -2, hip: -2, ra: moonRD.ra, dec: moonRD.dec, mag: moonMag, proper: "Moon", ci: 0.63, phase: moonIllum, distAU: moonDistAU }, x: _sc.x, y: _sc.y, altAz: { alt: _moonAlt, az: _moonAz } });
			}
		}

		visibleStars = newVisible;

		// 2D overlay
		ctx.clearRect(0, 0, W, H);
		drawSun(state);
		drawMoon(state);
		drawGround(_sunAlt);
		drawHoverRing(t, lat, lon, gmst);
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
				const hitR = s.star.id === -1 || s.star.id === -2 ? 24 : 18;
				const d = Math.hypot(mx - s.x, my - s.y);
				if (d < hitR && d < bd) {
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
