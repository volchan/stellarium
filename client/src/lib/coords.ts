export interface DmsParts {
	deg: string;
	min: string;
	sec: string;
	hemi: string;
}

// DD = decimal degrees ("48.856611"), DMM = degrees + decimal minutes
// ("48°51.397'"), DMS = degrees/minutes/seconds ("48°51'23.8\"").
export type CoordFormat = "dd" | "dmm" | "dms";

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

export function decToFormatParts(
	value: number,
	positiveHemi: string,
	negativeHemi: string,
	format: CoordFormat,
): DmsParts {
	const abs = Math.abs(value);
	const hemi = value >= 0 ? positiveHemi : negativeHemi;

	if (format === "dd") {
		// Decimal degrees carries its own sign — no separate hemisphere toggle needed.
		return { deg: value.toFixed(6), min: "", sec: "", hemi: positiveHemi };
	}

	let deg = Math.floor(abs);
	const minFloat = (abs - deg) * 60;

	if (format === "dmm") {
		let min = Number(minFloat.toFixed(4));
		if (min >= 60) {
			min -= 60;
			deg += 1;
		}
		return { deg: String(deg), min: min.toFixed(4), sec: "", hemi };
	}

	let min = Math.floor(minFloat);
	let sec = Number(((minFloat - min) * 60).toFixed(1));
	if (sec >= 60) {
		sec -= 60;
		min += 1;
	}
	if (min >= 60) {
		min -= 60;
		deg += 1;
	}
	return { deg: String(deg), min: String(min), sec: sec.toFixed(1), hemi };
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
