export interface DmsParts {
	deg: string;
	min: string;
	sec: string;
	hemi: string;
}

export function decToDmsParts(value: number, positiveHemi: string, negativeHemi: string): DmsParts {
	const abs = Math.abs(value);
	const deg = Math.floor(abs);
	const minFloat = (abs - deg) * 60;
	const min = Math.floor(minFloat);
	const sec = (minFloat - min) * 60;
	return {
		deg: String(deg),
		min: String(min),
		sec: sec.toFixed(1),
		hemi: value >= 0 ? positiveHemi : negativeHemi,
	};
}

export function dmsPartsToDec(
	deg: string,
	min: string,
	sec: string,
	hemi: string,
	negativeHemi: string,
): number {
	const d = Number.parseFloat(deg);
	if (Number.isNaN(d)) return Number.NaN;
	const m = min === "" ? 0 : Number.parseFloat(min);
	const s = sec === "" ? 0 : Number.parseFloat(sec);
	if (Number.isNaN(m) || Number.isNaN(s)) return Number.NaN;
	const value = d + m / 60 + s / 3600;
	return hemi === negativeHemi ? -value : value;
}

export function formatDms(value: number, positiveHemi: string, negativeHemi: string): string {
	const { deg, min, sec, hemi } = decToDmsParts(value, positiveHemi, negativeHemi);
	return `${deg}°${min}'${sec}"${hemi}`;
}

export function formatLatDms(lat: number): string {
	return formatDms(lat, "N", "S");
}

export function formatLonDms(lon: number): string {
	return formatDms(lon, "E", "W");
}
