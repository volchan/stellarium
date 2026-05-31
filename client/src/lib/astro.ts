const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function zuluToJD(zuluUnixSecs: number): number {
	return zuluUnixSecs / 86400 + 2440587.5;
}

export function jdToGMST(jd: number): number {
	const T = (jd - 2451545.0) / 36525;
	const gmst =
		280.46061837 +
		360.98564736629 * (jd - 2451545.0) +
		0.000387933 * T * T -
		(T * T * T) / 38710000;
	return ((gmst % 360) + 360) % 360;
}

export function raDec_to_AltAz(
	raHours: number,
	decDeg: number,
	latDeg: number,
	lonDeg: number,
	gmstDeg: number,
): { alt: number; az: number } {
	const lst = (((gmstDeg + lonDeg) % 360) + 360) % 360;
	const raDeg = raHours * 15;
	let H = (((lst - raDeg) % 360) + 360) % 360;
	if (H > 180) H -= 360;

	const Hrad = H * DEG;
	const latRad = latDeg * DEG;
	const decRad = decDeg * DEG;

	const sinAlt =
		Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(Hrad);
	const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;

	const cosAlt = Math.cos(alt * DEG);
	if (Math.abs(cosAlt) < 1e-10) return { alt, az: 0 };

	const cosAz =
		(Math.sin(decRad) - Math.sin(alt * DEG) * Math.sin(latRad)) / (cosAlt * Math.cos(latRad));
	let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD;
	if (Math.sin(Hrad) > 0) az = 360 - az;

	return { alt, az };
}

export function gnomonic(
	alt: number,
	az: number,
	camAz: number,
	camAlt: number,
	fovDeg: number,
	W: number,
	H: number,
): { x: number; y: number } | null {
	if (alt < -5) return null;

	const altR = alt * DEG;
	const azR = az * DEG;
	const camAzR = camAz * DEG;
	const camAltR = camAlt * DEG;

	const sx = Math.cos(altR) * Math.sin(azR);
	const sy = Math.cos(altR) * Math.cos(azR);
	const sz = Math.sin(altR);

	const cx = Math.cos(camAltR) * Math.sin(camAzR);
	const cy = Math.cos(camAltR) * Math.cos(camAzR);
	const cz = Math.sin(camAltR);

	const dot = sx * cx + sy * cy + sz * cz;
	if (dot <= 1e-6) return null;

	let rx = cy;
	let ry = -cx;
	const rlen = Math.sqrt(rx * rx + ry * ry);
	if (rlen < 1e-10) {
		rx = 1;
		ry = 0;
	} else {
		rx /= rlen;
		ry /= rlen;
	}
	const rz = 0;

	const ux = ry * cz - rz * cy;
	const uy = rz * cx - rx * cz;
	const uz = rx * cy - ry * cx;

	const scale = W / (2 * Math.tan((fovDeg * DEG) / 2));
	const projX = (sx * rx + sy * ry + sz * rz) / dot;
	const projY = (sx * ux + sy * uy + sz * uz) / dot;

	const screenX = W / 2 + projX * scale;
	const screenY = H / 2 - projY * scale;

	const margin = 20;
	if (screenX < -margin || screenX > W + margin || screenY < -margin || screenY > H + margin) {
		return null;
	}

	return { x: screenX, y: screenY };
}

// ── Sun (Meeus Ch. 25 abridged, error < 0.01°) ──────────

function norm360(x: number): number {
	return ((x % 360) + 360) % 360;
}

export function sunRaDec(jd: number): { ra: number; dec: number } {
	const n = jd - 2451545.0;
	const L = norm360(280.460 + 0.9856474 * n);
	const g = norm360(357.528 + 0.9856003 * n) * DEG;
	const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
	const eps = (23.439 - 0.0000004 * n) * DEG;
	const ra = (Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * RAD + 360) % 360 / 15;
	const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) * RAD;
	return { ra, dec };
}

// ── Moon (Meeus Ch. 47 abridged, error < 0.3°) ──────────

export function moonRaDec(jd: number): { ra: number; dec: number } {
	const T = (jd - 2451545.0) / 36525;
	const Lp = norm360(218.3164477 + 481267.88123421 * T);
	const D  = norm360(297.8501921 + 445267.1114034  * T) * DEG;
	const M  = norm360(357.5291092 + 35999.0502909   * T) * DEG;
	const Mp = norm360(134.9633964 + 477198.8675055  * T) * DEG;
	const F  = norm360(93.2720950  + 483202.0175233  * T) * DEG;

	const lon = Lp
		+ 6.289 * Math.sin(Mp)
		- 1.274 * Math.sin(2 * D - Mp)
		+ 0.658 * Math.sin(2 * D)
		- 0.214 * Math.sin(2 * Mp)
		- 0.186 * Math.sin(M)
		- 0.114 * Math.sin(2 * F);

	const lat =
		  5.128 * Math.sin(F)
		+ 0.281 * Math.sin(Mp + F)
		- 0.277 * Math.sin(Mp - F)
		- 0.173 * Math.sin(2 * D - F)
		- 0.055 * Math.sin(2 * D - Mp + F);

	const eps = (23.439 - 0.0000004 * (jd - 2451545.0)) * DEG;
	const lonR = lon * DEG;
	const latR = lat * DEG;

	const x = Math.cos(latR) * Math.cos(lonR);
	const y = Math.cos(eps) * Math.cos(latR) * Math.sin(lonR) - Math.sin(eps) * Math.sin(latR);
	const z = Math.sin(eps) * Math.cos(latR) * Math.sin(lonR) + Math.cos(eps) * Math.sin(latR);

	const ra = (Math.atan2(y, x) * RAD + 360) % 360 / 15;
	const dec = Math.asin(Math.max(-1, Math.min(1, z))) * RAD;
	return { ra, dec };
}

export function moonPhase(jd: number): number {
	const T = (jd - 2451545.0) / 36525;
	const D = norm360(297.8501921 + 445267.1114034 * T) * DEG;
	// phase 0=new, 0.5=full
	return (1 - Math.cos(2 * D)) / 2;
}

// ── Sky state ────────────────────────────────────────────

export type SkyState = "day" | "civil" | "nautical" | "astronomical" | "night";

export function skyStateFromAlt(sunAlt: number): SkyState {
	if (sunAlt >   0) return "day";
	if (sunAlt >  -6) return "civil";
	if (sunAlt > -12) return "nautical";
	if (sunAlt > -18) return "astronomical";
	return "night";
}

export function limitingMag(skyState: SkyState, userMag: number): number {
	if (skyState === "night")        return userMag;
	if (skyState === "astronomical") return Math.min(userMag, 5.5);
	if (skyState === "nautical")     return 4.0;
	if (skyState === "civil")        return 2.0;
	return 0;
}

export function bvToColor(ci: number | undefined): string {
	if (ci === undefined || ci === null || Number.isNaN(ci)) return "#FFFFFF";
	if (ci < -0.3) return "#9BB0FF";
	if (ci < 0.0) return "#BFCEFF";
	if (ci < 0.3) return "#E8F0FF";
	if (ci < 0.6) return "#FFFFFF";
	if (ci < 0.8) return "#FFFFD2";
	if (ci < 1.0) return "#FFE8A8";
	if (ci < 1.5) return "#FFD2A1";
	return "#FF8050";
}

// ── Kepler equation solver (Newton's method) ─────────────

function solveKepler(M: number, e: number): number {
	let E = M;
	for (let k = 0; k < 15; k++) {
		const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
		E += dE;
		if (Math.abs(dE) < 1e-10) break;
	}
	return E;
}

// ── Heliocentric ecliptic XYZ (AU) ───────────────────────

interface OrbEl {
	L0: number; L1: number;
	a0: number; a1: number;
	e0: number; e1: number;
	i0: number; i1: number;
	O0: number; O1: number;  // longitude of ascending node (Omega)
	w0: number; w1: number;  // longitude of perihelion (omega-tilde = Omega + omega)
}

function helioXYZ(T: number, el: OrbEl): { x: number; y: number; z: number; r: number } {
	const L    = norm360(el.L0 + el.L1 * T) * DEG;
	const a    = el.a0 + el.a1 * T;
	const e    = el.e0 + el.e1 * T;
	const inc  = (el.i0 + el.i1 * T) * DEG;
	const bigO = (el.O0 + el.O1 * T) * DEG;
	const bigW = (el.w0 + el.w1 * T) * DEG;
	const w    = bigW - bigO;
	const M    = ((L - bigW) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
	const E    = solveKepler(M, e);
	const v    = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
	const r    = a * (1 - e * Math.cos(E));

	const cosO = Math.cos(bigO), sinO = Math.sin(bigO);
	const cosW = Math.cos(w + v), sinW = Math.sin(w + v);
	const cosI = Math.cos(inc),  sinI = Math.sin(inc);

	return {
		x: r * (cosO * cosW - sinO * sinW * cosI),
		y: r * (sinO * cosW + cosO * sinW * cosI),
		z: r * sinW * sinI,
		r,
	};
}

// Orbital elements at J2000 (T=0) with rates per Julian century
// Meeus "Astronomical Algorithms" 2nd ed, Table 31.a
const EARTH_EL: OrbEl = {
	L0: 100.466457, L1: 36000.7698278,
	a0: 1.000001018, a1: 0,
	e0: 0.01670863, e1: -4.2037e-5,
	i0: 0, i1: 0,
	O0: 0, O1: 0,
	w0: 102.937348, w1: 0.3225557,
};

const PLANET_EL: Array<{ name: string; id: number; ci: number; el: OrbEl }> = [
	{ name: "Mercury", id: -3, ci: 0.93, el: { L0: 252.250906, L1: 149474.0722491, a0: 0.387098310, a1: 0,          e0: 0.20563175, e1:  2.0407e-5,  i0: 7.004986, i1: -5.9516e-3, O0:  48.330893, O1: -0.1254227, w0:  77.456119, w1: 0.1588643 } },
	{ name: "Venus",   id: -4, ci: 0.82, el: { L0: 181.979801, L1:  58519.2130302, a0: 0.723329820, a1: 0,          e0: 0.00677192, e1: -4.7765e-5, i0: 3.394662, i1: -8.568e-4,  O0:  76.679920, O1: -0.2780080, w0: 131.563703, w1: 0.0048746 } },
	{ name: "Mars",    id: -5, ci: 1.36, el: { L0: 355.433000, L1:  19141.6964471, a0: 1.523679342, a1: 0,          e0: 0.09340065, e1:  9.0484e-5, i0: 1.849726, i1: -6.011e-4,  O0:  49.558093, O1: -0.2950250, w0: 336.060234, w1: 0.4439016 } },
	{ name: "Jupiter", id: -6, ci: 0.83, el: { L0:  34.351519, L1:   3036.3027748, a0: 5.202603209, a1:  1.913e-7,  e0: 0.04849793, e1:  1.63225e-4,i0: 1.303267, i1: -5.4965e-3, O0: 100.464407, O1:  0.1767232, w0:  14.331207, w1: 0.2155209 } },
	{ name: "Saturn",  id: -7, ci: 1.04, el: { L0:  50.077444, L1:   1223.5110686, a0: 9.554909192, a1: -2.139e-6,  e0: 0.05554814, e1: -3.46641e-4,i0: 2.488879, i1: -3.7362e-3, O0: 113.665503, O1: -0.2566722, w0:  93.057237, w1: 0.5665415 } },
	{ name: "Uranus",  id: -8, ci: 0.28, el: { L0: 314.055005, L1:    429.8640561, a0:19.218446062, a1: -3.72e-8,   e0: 0.04630065, e1: -6.03263e-5,i0: 0.773197, i1:  7.744e-4,  O0:  74.005957, O1:  0.0741431, w0: 173.005291, w1: 0.0893212 } },
	{ name: "Neptune", id: -9, ci: 0.41, el: { L0: 304.348665, L1:    219.8833092, a0:30.110386869, a1: -1.663e-7,  e0: 0.00899704, e1:  6.330e-6,  i0: 1.769953, i1: -9.3082e-3, O0: 131.784057, O1:  1.1022039, w0:  48.120276, w1: 0.0291866 } },
];

function planetMag(name: string, r: number, delta: number, betaDeg: number): number {
	const l = 5 * Math.log10(r * delta);
	const b = betaDeg;
	switch (name) {
		case "Mercury": return -0.36 + l + 3.80e-3 * b - 2.73e-4 * b * b + 2e-6 * b * b * b;
		case "Venus":   return -4.29 + l + 0.0109 * b + 2.154e-4 * b * b - 2.8e-7 * b * b * b;
		case "Mars":    return -1.52 + l + 0.016 * b;
		case "Jupiter": return -9.25 + l + 0.014 * b;
		case "Saturn":  return -9.19 + l + 0.014 * b;
		case "Uranus":  return -7.19 + l;
		case "Neptune": return -6.87 + l;
		default:        return 99;
	}
}

// ── Public solar-system API ──────────────────────────────

export interface PlanetResult {
	name: string;
	id: number;
	ra: number;
	dec: number;
	mag: number;
	distAU: number;
	phase: number;
	ci: number;
}

export function computePlanets(jd: number): PlanetResult[] {
	const T   = (jd - 2451545.0) / 36525;
	const eps = (23.439 - 0.0000004 * (jd - 2451545.0)) * DEG;
	const earth = helioXYZ(T, EARTH_EL);
	const R = earth.r;

	return PLANET_EL.map(({ name, id, ci, el }) => {
		const p  = helioXYZ(T, el);
		const dx = p.x - earth.x;
		const dy = p.y - earth.y;
		const dz = p.z - earth.z;
		const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

		const yeq = Math.cos(eps) * dy - Math.sin(eps) * dz;
		const zeq = Math.sin(eps) * dy + Math.cos(eps) * dz;
		const ra  = ((Math.atan2(yeq, dx) * RAD) + 360) % 360 / 15;
		const dec = Math.asin(Math.max(-1, Math.min(1, zeq / delta))) * RAD;

		const cosBeta = (p.r * p.r + delta * delta - R * R) / (2 * p.r * delta);
		const betaDeg = Math.acos(Math.max(-1, Math.min(1, cosBeta))) * RAD;
		const phase   = (1 + cosBeta) / 2;
		const mag     = planetMag(name, p.r, delta, betaDeg);

		return { name, id, ra, dec, mag, distAU: delta, phase, ci };
	});
}

export function sunDistanceAU(jd: number): number {
	const n = jd - 2451545.0;
	const g = norm360(357.528 + 0.9856003 * n) * DEG;
	return 1.000140612 - 0.016708617 * Math.cos(g) - 0.000139589 * Math.cos(2 * g);
}

export function moonDistanceKm(jd: number): number {
	const T  = (jd - 2451545.0) / 36525;
	const D  = norm360(297.8501921 + 445267.1114034 * T) * DEG;
	const M  = norm360(357.5291092 + 35999.0502909  * T) * DEG;
	const Mp = norm360(134.9633964 + 477198.8675055 * T) * DEG;
	return 385000.56
		- 20905.355 * Math.cos(Mp)
		-  3699.111 * Math.cos(2 * D - Mp)
		-  2955.968 * Math.cos(2 * D)
		-   569.925 * Math.cos(2 * Mp)
		+    48.888 * Math.cos(M);
}
