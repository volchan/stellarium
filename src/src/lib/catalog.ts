export interface Star {
	id: number;
	hip: number;
	ra: number;
	dec: number;
	mag: number;
	proper?: string;
	bf?: string;
	ci?: number;
	dist?: number;
	spect?: string;
	con?: string;
}

export interface Constellation {
	abbr: string;
	name: string;
	lines: [number, number][];
}

let starsCache: Star[] | null = null;
let constsCache: Constellation[] | null = null;

export async function loadStars(): Promise<Star[]> {
	if (starsCache) return starsCache;
	const res = await fetch("/data/stars.json");
	if (!res.ok) throw new Error(`Failed to load stars: ${res.status}`);
	starsCache = await res.json();
	return starsCache as Star[];
}

export async function loadConstellations(): Promise<Constellation[]> {
	if (constsCache) return constsCache;
	const res = await fetch("/data/constellations.json");
	if (!res.ok) throw new Error(`Failed to load constellations: ${res.status}`);
	constsCache = await res.json();
	return constsCache as Constellation[];
}
