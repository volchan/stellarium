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
