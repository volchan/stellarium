<script setup lang="ts">
import { bvToColor } from "@/lib/astro";
import { useUiStore } from "@/stores/ui";
import { computed, ref, watch } from "vue";

const ui = useUiStore();

interface AladinInst {
	gotoRaDec(ra: number, dec: number): void;
	increaseZoom(): void;
	decreaseZoom(): void;
	setImageSurvey(url: string): void;
	getFov(): [number, number];
}

const SURVEYS = [
	{ label: "OPT", title: "DSS2 Color (optical)", url: "https://alasky.cds.unistra.fr/DSS/DSSColor" },
	{ label: "IR", title: "2MASS Color (infrared)", url: "https://alasky.cds.unistra.fr/2MASS/Color" },
	{ label: "UV", title: "GALEX UV", url: "https://alasky.cds.unistra.fr/GALEX/GR6_7-AIS_Color" },
];
const surveyIndex = ref(0);

let aladinInst: AladinInst | null = null;
let aladinLoadPromise: Promise<void> | null = null;
let aladinPendingRa = 0;
let aladinPendingDec = 0;

function loadAladinLite(): Promise<void> {
	if (aladinLoadPromise) return aladinLoadPromise;
	aladinLoadPromise = new Promise<void>((resolve) => {
		const script = document.createElement("script");
		script.src = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";
		script.charset = "utf-8";
		script.onload = () => resolve();
		script.onerror = () => resolve();
		document.head.appendChild(script);
	});
	return aladinLoadPromise;
}

async function updateAladin(raDeg: number, decDeg: number) {
	aladinPendingRa = raDeg;
	aladinPendingDec = decDeg;
	await loadAladinLite();
	// biome-ignore lint/suspicious/noExplicitAny: Aladin Lite v3 has no TS typings
	const A = (window as any).A;
	if (!A) return;
	if (A.init) await A.init;
	if (placeholderVisible.value) placeholderVisible.value = false;
	if (aladinInst) {
		aladinInst.gotoRaDec(aladinPendingRa, aladinPendingDec);
	} else {
		aladinInst = (await A.aladin("#sc-aladin", {
			fov: 0.5,
			survey: SURVEYS[0].url,
			target: `${aladinPendingRa} ${aladinPendingDec}`,
			showReticle: false,
			showZoomControl: false,
			showFullscreenControl: false,
			showLayersControl: false,
			showGotoControl: false,
			showShareControl: false,
			showCooGrid: false,
			showStatusBar: false,
			showProjectionControl: false,
			showCooFrame: false,
			showContextMenu: false,
			showSimbadPointerControl: false,
		})) as AladinInst;
	}
}

const placeholderVisible = ref(true);

function cycleSurvey() {
	surveyIndex.value = (surveyIndex.value + 1) % SURVEYS.length;
	aladinInst?.setImageSurvey(SURVEYS[surveyIndex.value].url);
}

function formatDist(parsecs: number): string {
	const ly = parsecs * 3.26156;
	if (ly < 100) return `${ly.toFixed(1)} ly`;
	if (ly < 10000) return `${Math.round(ly).toLocaleString()} ly`;
	return `${(ly / 1000).toFixed(1)}k ly`;
}

function formatRa(raDeg: number): string {
	const h = Math.floor(raDeg / 15);
	const m = Math.floor((raDeg / 15 - h) * 60);
	return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function formatDec(dec: number): string {
	const sign = dec >= 0 ? "+" : "−";
	const abs = Math.abs(dec);
	const d = Math.floor(abs);
	const m = Math.floor((abs - d) * 60);
	return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}′`;
}

const star = computed(() => ui.pinnedStar);

watch(star, (s) => {
	if (!s) return;
	placeholderVisible.value = true;
	surveyIndex.value = 0;
	updateAladin(s.star.ra * 15, s.star.dec);
});

// Draggable logic
const cardRef = ref<HTMLElement | null>(null);
const headRef = ref<HTMLElement | null>(null);
let cardDrag = false;
let cardOffX = 0;
let cardOffY = 0;

function onHeadPointerDown(e: PointerEvent) {
	if ((e.target as HTMLElement).closest(".btn-icon")) return;
	cardDrag = true;
	const rect = cardRef.value?.getBoundingClientRect();
	cardOffX = e.clientX - (rect?.left ?? 0);
	cardOffY = e.clientY - (rect?.top ?? 0);
	headRef.value?.setPointerCapture(e.pointerId);
}
function onHeadPointerMove(e: PointerEvent) {
	if (!cardDrag || !cardRef.value) return;
	cardRef.value.style.left = `${e.clientX - cardOffX}px`;
	cardRef.value.style.top = `${e.clientY - cardOffY}px`;
	cardRef.value.style.bottom = "auto";
}
function onHeadPointerUp() {
	cardDrag = false;
}

function close() {
	ui.pinnedStar = null;
}
</script>

<template>
  <div ref="cardRef" :class="['star-card', star ? 'visible' : '']">

    <!-- Header / drag handle -->
    <div
      ref="headRef"
      class="sc-head"
      @pointerdown="onHeadPointerDown"
      @pointermove="onHeadPointerMove"
      @pointerup="onHeadPointerUp"
    >
      <div class="sc-title">
        <div class="sc-name">{{ star?.star.proper ?? star?.star.bf ?? (star?.star.hip ? `HIP ${star.star.hip}` : '—') }}</div>
        <div class="sc-sub">
          <span v-if="star?.star.bf" class="sc-bf">{{ star.star.bf }}</span>
          <span v-if="star?.star.bf && star?.star.con" class="sc-dot">·</span>
          <span v-if="star?.star.con" class="sc-con">{{ star.star.con }}</span>
          <span v-if="star?.star.spect" class="sc-dot">·</span>
          <span v-if="star?.star.spect" class="sc-spect">
            <span class="spec-pip" :style="{ background: bvToColor(star.star.ci) }"></span>
            {{ star.star.spect }}
          </span>
        </div>
      </div>
      <button class="btn-icon" type="button" @click="close" title="Close">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Sky preview -->
    <div class="sc-preview">
      <div id="sc-aladin"></div>
      <div v-if="placeholderVisible" class="sc-placeholder">
        <svg class="sc-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span>Loading sky…</span>
      </div>

      <!-- Custom controls overlay -->
      <div class="sc-controls">
        <button class="sc-ctrl-btn" type="button" title="Zoom in" @click="aladinInst?.increaseZoom()">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
        </button>
        <button class="sc-ctrl-btn" type="button" title="Zoom out" @click="aladinInst?.decreaseZoom()">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
        </button>
        <div class="sc-ctrl-sep"></div>
        <button
          class="sc-ctrl-btn sc-survey-btn"
          type="button"
          :title="SURVEYS[surveyIndex].title"
          @click="cycleSurvey"
        >{{ SURVEYS[surveyIndex].label }}</button>
      </div>

      <!-- RA / Dec bar -->
      <div v-if="star && !placeholderVisible" class="sc-coords-bar">
        <span>RA {{ formatRa(star.star.ra * 15) }}</span>
        <span class="sc-coords-sep">·</span>
        <span>Dec {{ formatDec(star.star.dec) }}</span>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="sc-body">
      <div class="sc-stat">
        <span class="sc-stat-k">Magnitude</span>
        <span class="sc-stat-v">{{ star ? (star.star.mag < 0 ? '' : '+') + star.star.mag.toFixed(2) : '—' }}</span>
      </div>
      <div class="sc-stat">
        <span class="sc-stat-k">Distance</span>
        <span class="sc-stat-v">{{ star?.star.dist ? formatDist(star.star.dist) : '—' }}</span>
      </div>
      <div class="sc-stat">
        <span class="sc-stat-k">Altitude</span>
        <span class="sc-stat-v">{{ star ? `${star.altAz.alt >= 0 ? '+' : ''}${star.altAz.alt.toFixed(1)}°` : '—' }}</span>
      </div>
      <div class="sc-stat">
        <span class="sc-stat-k">Azimuth</span>
        <span class="sc-stat-v">{{ star ? `${star.altAz.az.toFixed(1)}°` : '—' }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.star-card {
  position: absolute;
  bottom: 44px; left: 16px;
  width: 360px;
  background: rgba(7, 9, 17, 0.97);
  border: 1px solid rgba(28, 32, 53, 0.9);
  border-radius: 10px;
  z-index: 150;
  overflow: hidden;
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease;
  pointer-events: none;
  backdrop-filter: blur(24px);
  touch-action: none;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
}
.star-card.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* ── Header ── */
.sc-head {
  padding: 13px 14px 11px;
  border-bottom: 1px solid rgba(28, 32, 53, 0.9);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  cursor: grab;
  user-select: none;
}
.sc-head:active { cursor: grabbing; }

.sc-title { flex: 1; min-width: 0; }

.sc-name {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.sc-bf, .sc-con {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent);
  letter-spacing: 0.04em;
}
.sc-con { color: var(--muted); }
.sc-dot { color: rgba(28, 32, 53, 0.9); font-size: 10px; }
.sc-spect {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.spec-pip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  opacity: 0.85;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(90, 101, 133, 0.5);
  padding: 4px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 120ms, background 120ms;
  flex: none;
}
.btn-icon:hover { color: var(--fg); background: rgba(255,255,255,0.05); }

/* ── Preview ── */
.sc-preview {
  width: 100%;
  height: 300px;
  background: #000408;
  border-bottom: 1px solid rgba(28, 32, 53, 0.9);
  position: relative;
  overflow: hidden;
}
#sc-aladin { width: 100%; height: 100%; }

/* Aladin injected UI cleanup */
:deep(.aladin-location) { display: none !important; }
:deep(.aladin-toolbar) { display: none !important; }

.sc-placeholder {
  position: absolute; inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #000408;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(90, 101, 133, 0.5);
  text-transform: uppercase;
}
.sc-spin {
  opacity: 0.3;
  animation: spin 1.4s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Custom controls */
.sc-controls {
  position: absolute;
  top: 10px; right: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 10;
}
.sc-ctrl-btn {
  width: 28px;
  height: 28px;
  background: rgba(7, 9, 17, 0.88);
  border: 1px solid rgba(28, 32, 53, 0.9);
  border-radius: 6px;
  color: rgba(160, 180, 220, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 120ms, background 120ms, border-color 120ms;
  backdrop-filter: blur(8px);
}
.sc-ctrl-btn:hover {
  background: rgba(20, 24, 40, 0.95);
  border-color: rgba(74, 120, 200, 0.5);
  color: rgba(200, 215, 240, 0.95);
}
.sc-survey-btn {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.sc-ctrl-sep {
  height: 5px;
}

/* RA/Dec bar */
.sc-coords-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 5px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.72));
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: rgba(120, 140, 180, 0.65);
  letter-spacing: 0.05em;
  pointer-events: none;
}
.sc-coords-sep { color: rgba(40, 50, 80, 0.9); }

/* ── Stats ── */
.sc-body {
  padding: 11px 14px 13px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 6px;
}
.sc-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sc-stat-k {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(90, 101, 133, 0.55);
}
.sc-stat-v {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--fg-dim);
  letter-spacing: 0.02em;
}

/* ── Mobile ── */
@media (max-width: 500px) {
  .star-card {
    width: calc(100vw - 24px);
    left: 12px !important;
    right: 12px;
    bottom: 36px !important;
    top: auto !important;
    max-height: calc(100svh - 90px);
    display: flex;
    flex-direction: column;
  }
  .sc-preview { height: 220px; flex: none; }
  .sc-body { overflow-y: auto; flex: 1; }
}
</style>
