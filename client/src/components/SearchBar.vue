<script setup lang="ts">
import {
	computePlanets,
	jdToGMST,
	moonDistanceKm,
	moonPhase,
	moonRaDec,
	raDec_to_AltAz,
	sunDistanceAU,
	sunRaDec,
	zuluToJD,
} from "@/lib/astro";
import { loadStars } from "@/lib/catalog";
import type { Star } from "@/lib/catalog";
import type { VisibleStar } from "@/lib/renderer";
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const ui = useUiStore();
const telemetry = useTelemetryStore();

const query = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const activeIdx = ref(0);
let allStars: Star[] = [];

onMounted(async () => {
	try {
		allStars = await loadStars();
	} catch {
		// catalog unavailable (e.g. Storybook / test environments)
	}
	await nextTick();
	inputRef.value?.focus();
});

interface SearchResult {
	label: string;
	sublabel: string;
	mag: number;
	star: Star;
}

const results = computed((): SearchResult[] => {
	const q = query.value.trim().toLowerCase();
	if (q.length < 2) return [];

	const out: SearchResult[] = [];

	// Sun & Moon
	for (const [label, id, mag] of [["Sun", -1, -26.74], ["Moon", -2, -12.74]] as [string, number, number][]) {
		if (label.toLowerCase().includes(q)) {
			out.push({ label, sublabel: "Solar System", mag, star: { id, hip: id, ra: 0, dec: 0, mag, proper: label } });
		}
	}

	// Planets
	const jd = zuluToJD(telemetry.zuluTime);
	for (const pl of computePlanets(jd)) {
		if (pl.name.toLowerCase().includes(q)) {
			out.push({
				label: pl.name,
				sublabel: `Solar System · mag ${pl.mag.toFixed(1)}`,
				mag: pl.mag,
				star: { id: pl.id, hip: pl.id, ra: pl.ra, dec: pl.dec, mag: pl.mag, proper: pl.name, ci: pl.ci, phase: pl.phase, distAU: pl.distAU },
			});
		}
	}

	// Catalog stars — match proper name, Bayer/Flamsteed, or HIP number
	const qRaw = query.value.trim();
	const isHip = /^\d+$/.test(qRaw);
	let catCount = 0;
	for (const star of allStars) {
		if (catCount >= 10) break;
		if (star.id === 0) continue;
		const nameMatch =
			(star.proper && star.proper.toLowerCase().includes(q)) ||
			(star.bf && star.bf.toLowerCase().includes(q));
		const hipMatch = isHip && star.hip.toString() === qRaw;
		if (nameMatch || hipMatch) {
			out.push({
				label: star.proper || star.bf || `HIP ${star.hip}`,
				sublabel: [star.con, `mag ${star.mag.toFixed(1)}`].filter(Boolean).join(" · "),
				mag: star.mag,
				star,
			});
			catCount++;
		}
	}

	out.sort((a, b) => a.mag - b.mag);
	return out.slice(0, 12);
});

watch(results, () => { activeIdx.value = 0; });

function selectResult(r: SearchResult) {
	const jd = zuluToJD(telemetry.zuluTime);
	const gmst = jdToGMST(jd);
	const { lat, lon } = telemetry;

	let star = r.star;
	let altAz: { alt: number; az: number };

	if (star.id === -1) {
		const rd = sunRaDec(jd);
		star = { ...star, ra: rd.ra, dec: rd.dec, distAU: sunDistanceAU(jd) };
		altAz = raDec_to_AltAz(rd.ra, rd.dec, lat, lon, gmst);
	} else if (star.id === -2) {
		const rd = moonRaDec(jd);
		const illum = moonPhase(jd);
		const mag = -12.74 + 2.5 * Math.log10(1 / Math.max(0.001, illum));
		star = { ...star, ra: rd.ra, dec: rd.dec, mag, phase: illum, distAU: moonDistanceKm(jd) / 149597870.7 };
		altAz = raDec_to_AltAz(rd.ra, rd.dec, lat, lon, gmst);
	} else {
		altAz = raDec_to_AltAz(star.ra, star.dec, lat, lon, gmst);
	}

	ui.camera.az = altAz.az;
	ui.camera.alt = altAz.alt;
	ui.pinnedStar = { star, x: window.innerWidth / 2, y: window.innerHeight / 2, altAz } as VisibleStar;

	close();
}

function close() {
	ui.searchOpen = false;
	query.value = "";
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") { close(); return; }
	if (e.key === "ArrowDown") { e.preventDefault(); activeIdx.value = Math.min(activeIdx.value + 1, results.value.length - 1); return; }
	if (e.key === "ArrowUp")   { e.preventDefault(); activeIdx.value = Math.max(activeIdx.value - 1, 0); return; }
	if (e.key === "Enter" && results.value.length > 0) { selectResult(results.value[activeIdx.value]); return; }
}

function onGlobalKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") close();
}
onMounted(() => window.addEventListener("keydown", onGlobalKeydown));
onUnmounted(() => window.removeEventListener("keydown", onGlobalKeydown));
</script>

<template>
  <div class="search-backdrop" @click.self="close">
    <div class="search-panel">
      <div class="search-input-wrap">
        <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref="inputRef"
          v-model="query"
          class="search-input"
          data-testid="search-input"
          type="text"
          placeholder="Search stars, planets, constellations…"
          autocomplete="off"
          spellcheck="false"
          @keydown="onKeydown"
        />
        <kbd class="search-esc" @click="close">Esc</kbd>
      </div>

      <ul v-if="results.length > 0" class="search-results" data-testid="search-results">
        <li
          v-for="(r, i) in results"
          :key="r.star.id + r.label"
          class="search-result"
          data-testid="search-result"
          :class="{ active: i === activeIdx }"
          @click="selectResult(r)"
          @mouseenter="activeIdx = i"
        >
          <span class="sr-label">{{ r.label }}</span>
          <span class="sr-sub">{{ r.sublabel }}</span>
        </li>
      </ul>

      <div v-else-if="query.trim().length >= 2" class="search-empty">No results</div>

      <div v-else class="search-hint">Type at least 2 characters</div>
    </div>
  </div>
</template>

<style scoped>
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.52);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.search-panel {
  width: min(540px, calc(100vw - 32px));
  background: rgba(9, 11, 20, 0.97);
  border: 1px solid rgba(74, 158, 255, 0.22);
  border-radius: 10px;
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.search-icon {
  flex: none;
  color: var(--muted);
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--fg);
  caret-color: var(--accent);
}
.search-input::placeholder { color: rgba(90, 101, 133, 0.45); }

.search-esc {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--muted);
  background: rgba(13, 15, 26, 0.9);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 2px 6px;
  cursor: pointer;
  user-select: none;
  flex: none;
}

.search-results {
  list-style: none;
  margin: 0;
  padding: 6px 0;
  max-height: 340px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 14px;
  cursor: pointer;
  transition: background var(--motion-fast);
}
.search-result.active,
.search-result:hover {
  background: rgba(74, 158, 255, 0.08);
}

.sr-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: 0.02em;
}

.sr-sub {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.search-empty,
.search-hint {
  padding: 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: rgba(90, 101, 133, 0.45);
  text-align: center;
}
</style>
