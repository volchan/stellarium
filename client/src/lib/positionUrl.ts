export interface UrlPosition {
	lat: number;
	lon: number;
	alt: number;
	hdg: number;
}

export function applyPositionToUrl(pos: UrlPosition): void {
	const url = new URL(window.location.href);
	url.search = "";
	const p = url.searchParams;
	p.set("lat", pos.lat.toFixed(6));
	p.set("lon", pos.lon.toFixed(6));
	p.set("alt", String(Math.round(pos.alt)));
	p.set("hdg", String(Math.round(pos.hdg)));
	window.history.replaceState({}, "", url.toString());
}

export function clearPositionUrl(): void {
	const url = new URL(window.location.href);
	url.search = "";
	window.history.replaceState({}, "", url.toString());
}

export function parsePositionParams(search: string): UrlPosition | null {
	const p = new URLSearchParams(search);
	const lat = Number.parseFloat(p.get("lat") ?? "");
	const lon = Number.parseFloat(p.get("lon") ?? "");
	if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

	const alt = Number.parseFloat(p.get("alt") ?? "0") || 0;
	const hdg = ((Number.parseFloat(p.get("hdg") ?? "0") || 0) % 360 + 360) % 360;

	return { lat, lon, alt, hdg };
}
