import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_DIR = resolve(ROOT, "data");
const OUT_DIR = resolve(ROOT, "dist/data");

const HYG_PATH = resolve(DATA_DIR, "hygdata_v41.csv");
const FAB_PATH = resolve(DATA_DIR, "constellationship.fab");
const HYG_URL =
	"https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv";
const FAB_URL =
	"https://raw.githubusercontent.com/Stellarium/stellarium/v0.21.3/skycultures/western/constellationship.fab";

const IAU_NAMES: Record<string, string> = {
	And: "Andromeda",
	Ant: "Antlia",
	Aps: "Apus",
	Aql: "Aquila",
	Aqr: "Aquarius",
	Ara: "Ara",
	Ari: "Aries",
	Aur: "Auriga",
	Boo: "Boötes",
	Cae: "Caelum",
	Cam: "Camelopardalis",
	Cap: "Capricornus",
	Car: "Carina",
	Cas: "Cassiopeia",
	Cen: "Centaurus",
	Cep: "Cepheus",
	Cet: "Cetus",
	Cha: "Chamaeleon",
	Cir: "Circinus",
	CMa: "Canis Major",
	CMi: "Canis Minor",
	Cnc: "Cancer",
	Col: "Columba",
	Com: "Coma Berenices",
	CrA: "Corona Australis",
	CrB: "Corona Borealis",
	Crt: "Crater",
	Cru: "Crux",
	Crv: "Corvus",
	CVn: "Canes Venatici",
	Cyg: "Cygnus",
	Del: "Delphinus",
	Dor: "Dorado",
	Dra: "Draco",
	Equ: "Equuleus",
	Eri: "Eridanus",
	For: "Fornax",
	Gem: "Gemini",
	Gru: "Grus",
	Her: "Hercules",
	Hor: "Horologium",
	Hya: "Hydra",
	Hyi: "Hydrus",
	Ind: "Indus",
	Lac: "Lacerta",
	Leo: "Leo",
	LMi: "Leo Minor",
	Lep: "Lepus",
	Lib: "Libra",
	Lup: "Lupus",
	Lyn: "Lynx",
	Lyr: "Lyra",
	Men: "Mensa",
	Mic: "Microscopium",
	Mon: "Monoceros",
	Mus: "Musca",
	Nor: "Norma",
	Oct: "Octans",
	Oph: "Ophiuchus",
	Ori: "Orion",
	Pav: "Pavo",
	Peg: "Pegasus",
	Per: "Perseus",
	Phe: "Phoenix",
	Pic: "Pictor",
	PsA: "Piscis Austrinus",
	Psc: "Pisces",
	Pup: "Puppis",
	Pyx: "Pyxis",
	Ret: "Reticulum",
	Scl: "Sculptor",
	Sco: "Scorpius",
	Sct: "Scutum",
	Ser: "Serpens",
	Sex: "Sextans",
	Sge: "Sagitta",
	Sgr: "Sagittarius",
	Tau: "Taurus",
	Tel: "Telescopium",
	TrA: "Triangulum Australe",
	Tri: "Triangulum",
	Tuc: "Tucana",
	UMa: "Ursa Major",
	UMi: "Ursa Minor",
	Vel: "Vela",
	Vir: "Virgo",
	Vol: "Volans",
	Vul: "Vulpecula",
};

async function download(url: string, dest: string): Promise<void> {
	console.log(`Downloading ${url}…`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	const text = await res.text();
	writeFileSync(dest, text, "utf-8");
	console.log(`  → saved to ${dest}`);
}

async function ensureFile(path: string, url: string): Promise<void> {
	if (!existsSync(path)) {
		await download(url, path);
	} else {
		console.log(`Using cached ${path}`);
	}
}

interface StarOut {
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

function unquote(s: string): string {
	return s.trim().replace(/^"(.*)"$/, "$1");
}

function splitCsvRow(line: string): string[] {
	return line.split(",").map(unquote);
}

function parseHYG(
	csv: string,
	magLimit: number,
): { stars: StarOut[]; hipToId: Map<number, number> } {
	const lines = csv.split("\n");
	const header = lines[0].split(",").map(unquote);
	const col = (name: string) => header.indexOf(name);

	const cId = col("id");
	const cHip = col("hip");
	const cBf = col("bf");
	const cProper = col("proper");
	const cRa = col("ra");
	const cDec = col("dec");
	const cDist = col("dist");
	const cMag = col("mag");
	const cSpect = col("spect");
	const cCi = col("ci");
	const cCon = col("con");

	const stars: StarOut[] = [];
	const hipToId = new Map<number, number>();

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const f = splitCsvRow(line);

		const mag = Number.parseFloat(f[cMag]);
		if (Number.isNaN(mag) || mag > magLimit) continue;

		const id = Number.parseInt(f[cId]);
		const hip = Number.parseInt(f[cHip]) || 0;
		const ra = Number.parseFloat(f[cRa]);
		const dec = Number.parseFloat(f[cDec]);
		const dist = Number.parseFloat(f[cDist]) || undefined;
		const ci = f[cCi] !== "" ? Number.parseFloat(f[cCi]) : undefined;
		const proper = f[cProper]?.trim() || undefined;
		const bf = f[cBf]?.trim() || undefined;
		const spect = f[cSpect]?.trim() || undefined;
		const con = f[cCon]?.trim() || undefined;

		const star: StarOut = { id, hip, ra, dec, mag };
		if (proper) star.proper = proper;
		if (bf) star.bf = bf;
		if (ci !== undefined && !Number.isNaN(ci)) star.ci = ci;
		if (dist !== undefined && !Number.isNaN(dist) && dist > 0 && dist < 1e10) star.dist = dist;
		if (spect) star.spect = spect;
		if (con) star.con = con;

		stars.push(star);
		if (hip) hipToId.set(hip, id);
	}

	return { stars, hipToId };
}

interface ConstellationOut {
	abbr: string;
	name: string;
	lines: [number, number][];
}

function parseFAB(fab: string, hipToId: Map<number, number>): ConstellationOut[] {
	const result: ConstellationOut[] = [];

	for (const rawLine of fab.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const parts = line.split(/\s+/);
		if (parts.length < 3) continue;

		const abbr = parts[0];
		const count = Number.parseInt(parts[1]);
		if (Number.isNaN(count)) continue;

		const hipIds = parts.slice(2).map(Number);
		if (hipIds.length < count * 2) continue;

		const lines: [number, number][] = [];
		for (let i = 0; i < count; i++) {
			const h1 = hipIds[i * 2];
			const h2 = hipIds[i * 2 + 1];
			lines.push([h1, h2]);
		}

		result.push({
			abbr,
			name: IAU_NAMES[abbr] ?? abbr,
			lines,
		});
	}

	return result;
}

async function main() {
	mkdirSync(DATA_DIR, { recursive: true });
	mkdirSync(OUT_DIR, { recursive: true });

	await ensureFile(HYG_PATH, HYG_URL);
	await ensureFile(FAB_PATH, FAB_URL);

	console.log("Parsing HYG catalog…");
	const hygCsv = readFileSync(HYG_PATH, "utf-8");
	const { stars, hipToId } = parseHYG(hygCsv, 6.5);
	console.log(`  → ${stars.length} stars (mag ≤ 6.5)`);

	const starsOut = resolve(OUT_DIR, "stars.json");
	writeFileSync(starsOut, JSON.stringify(stars), "utf-8");
	console.log(`  → written to ${starsOut}`);

	console.log("Parsing constellationship.fab…");
	const fab = readFileSync(FAB_PATH, "utf-8");
	const constellations = parseFAB(fab, hipToId);
	console.log(`  → ${constellations.length} constellations`);

	const constsOut = resolve(OUT_DIR, "constellations.json");
	writeFileSync(constsOut, JSON.stringify(constellations), "utf-8");
	console.log(`  → written to ${constsOut}`);

	console.log("Done.");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
