<script setup lang="ts">
import { loadConstellations, loadStars } from "@/lib/catalog";
import type { AppState } from "@/lib/renderer";
import { initRenderer } from "@/lib/renderer";
import type { RendererHandle } from "@/lib/renderer";
import { useSettingsStore } from "@/stores/settings";
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import { onMounted, onUnmounted, ref } from "vue";
import CompassBar from "./CompassBar.vue";
import PositionSetup from "./PositionSetup.vue";
import SearchBar from "./SearchBar.vue";
import SettingsPanel from "./SettingsPanel.vue";
import StarCard from "./StarCard.vue";
import StarTooltip from "./StarTooltip.vue";
import TimeControls from "./TimeControls.vue";

const telemetry = useTelemetryStore();
const settings = useSettingsStore();
const ui = useUiStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const constLabelsRef = ref<HTMLElement | null>(null);

const starsCount = ref(0);
const constsCount = ref(0);

let renderer: RendererHandle | null = null;

function getState(): AppState {
	return {
		constLines: settings.constLines,
		constNames: settings.constNames,
		starLabels: settings.starLabels,
		mag: settings.mag,
		fov: settings.fov,
		showSun: settings.showSun,
		showMoon: settings.showMoon,
		telemetry: {
			lat: telemetry.lat,
			lon: telemetry.lon,
			alt: telemetry.alt,
			headingTrue: telemetry.headingTrue,
			pitch: telemetry.pitch,
			zuluTime: telemetry.zuluTime,
		},
		camera: {
			az: ui.camera.az,
			alt: ui.camera.alt,
		},
	};
}

let isDragging = false;
let didDrag = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartAz = 0;
let dragStartAlt = 0;

function onMouseMove(e: MouseEvent) {
	if (!canvasRef.value || !renderer) return;
	const r = canvasRef.value.getBoundingClientRect();
	const s = renderer.starAt(e.clientX - r.left, e.clientY - r.top);
	renderer.setHovered(s);
	ui.hoveredStar = s;
	canvasRef.value.style.cursor = s ? "pointer" : "crosshair";
}

function onMouseLeave() {
	if (!renderer) return;
	renderer.setHovered(null);
	ui.hoveredStar = null;
	if (canvasRef.value) canvasRef.value.style.cursor = "crosshair";
}

function onClick(e: MouseEvent) {
	if (!canvasRef.value || !renderer || didDrag) return;
	const r = canvasRef.value.getBoundingClientRect();
	const s = renderer.starAt(e.clientX - r.left, e.clientY - r.top);
	if (s) {
		renderer.setPinned(s);
		ui.pinnedStar = s;

		// Position card near star (desktop)
		if (window.innerWidth >= 640) {
			const cardEl = document.querySelector<HTMLElement>(".star-card");
			if (cardEl) {
				const CARD_W = 360;
				const CARD_H = 460;
				const M = 10;
				const x = Math.max(M, Math.min(window.innerWidth - CARD_W - M, s.x + 24));
				const y = Math.max(52, Math.min(window.innerHeight - 52 - CARD_H, s.y - CARD_H / 2));
				cardEl.style.left = `${x}px`;
				cardEl.style.top = `${y}px`;
				cardEl.style.bottom = "auto";
			}
		}
	}
}

function onMouseDown(e: MouseEvent) {
	if (e.button !== 0) return;
	isDragging = true;
	didDrag = false;
	dragStartX = e.clientX;
	dragStartY = e.clientY;
	dragStartAz = ui.camera.az;
	dragStartAlt = ui.camera.alt;
}

function onWindowMouseMove(e: MouseEvent) {
	if (!isDragging || !canvasRef.value) return;
	const dx = e.clientX - dragStartX;
	if (!didDrag && (Math.abs(dx) > 3 || Math.abs(e.clientY - dragStartY) > 3)) didDrag = true;
	const dy = e.clientY - dragStartY;
	const degPerPx =
		settings.fov / Math.min(canvasRef.value.offsetWidth, canvasRef.value.offsetHeight);
	ui.camera.az = (((dragStartAz - dx * degPerPx) % 360) + 360) % 360;
	ui.camera.alt = Math.max(-89, Math.min(89, dragStartAlt + dy * degPerPx));
}

function onWindowMouseUp() {
	isDragging = false;
}

let lastTouchDist = 0;

function onTouchStart(e: TouchEvent) {
	if (e.touches.length === 1) {
		isDragging = true;
		dragStartX = e.touches[0].clientX;
		dragStartY = e.touches[0].clientY;
		dragStartAz = ui.camera.az;
		dragStartAlt = ui.camera.alt;
	} else if (e.touches.length === 2) {
		isDragging = false;
		lastTouchDist = Math.hypot(
			e.touches[0].clientX - e.touches[1].clientX,
			e.touches[0].clientY - e.touches[1].clientY,
		);
	}
}

function onTouchMove(e: TouchEvent) {
	if (!canvasRef.value) return;
	if (e.touches.length === 1 && isDragging) {
		const dx = e.touches[0].clientX - dragStartX;
		const dy = e.touches[0].clientY - dragStartY;
		const degPerPx =
			settings.fov / Math.min(canvasRef.value.offsetWidth, canvasRef.value.offsetHeight);
		ui.camera.az = (((dragStartAz - dx * degPerPx) % 360) + 360) % 360;
		ui.camera.alt = Math.max(-89, Math.min(89, dragStartAlt + dy * degPerPx));
	} else if (e.touches.length === 2) {
		const dist = Math.hypot(
			e.touches[0].clientX - e.touches[1].clientX,
			e.touches[0].clientY - e.touches[1].clientY,
		);
		settings.fov = Math.max(10, Math.min(180, settings.fov + (lastTouchDist - dist) * 0.2));
		lastTouchDist = dist;
	}
}

function onTouchEnd() {
	isDragging = false;
}

function onWheel(e: WheelEvent) {
	e.preventDefault();
	settings.fov = Math.max(10, Math.min(180, settings.fov + e.deltaY * 0.05));
}

onMounted(async () => {
	if (!canvasRef.value || !constLabelsRef.value) return;

	let stars: Awaited<ReturnType<typeof loadStars>> = [];
	let constellations: Awaited<ReturnType<typeof loadConstellations>> = [];

	try {
		[stars, constellations] = await Promise.all([loadStars(), loadConstellations()]);
		starsCount.value = stars.length;
		constsCount.value = constellations.length;
	} catch (e) {
		console.warn("Catalog not found, running with background stars only:", e);
	}

	renderer = initRenderer(canvasRef.value, constLabelsRef.value, getState, stars, constellations);

	window.addEventListener("mousemove", onWindowMouseMove);
	window.addEventListener("mouseup", onWindowMouseUp);
});

onUnmounted(() => {
	renderer?.dispose();
	window.removeEventListener("mousemove", onWindowMouseMove);
	window.removeEventListener("mouseup", onWindowMouseUp);
});

defineExpose({ renderer: () => renderer });
</script>

<template>
  <div class="sky-wrap">
    <canvas
      ref="canvasRef"
      id="sky"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @click="onClick"
      @mousedown="onMouseDown"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @wheel.prevent="onWheel"
    />
    <div ref="constLabelsRef" id="const-labels" />
    <CompassBar v-if="ui.coordsSet" />

    <div class="key-hints">
      <div class="key-hint"><kbd>/</kbd> Search</div>
      <div class="key-hint"><kbd>S</kbd> Settings</div>
      <div class="key-hint"><kbd>Scroll</kbd> Zoom</div>
    </div>

    <StarTooltip />
    <SettingsPanel :stars-count="starsCount" :consts-count="constsCount" />
    <StarCard />
    <PositionSetup />
    <TimeControls v-if="ui.coordsSet" />
    <SearchBar v-if="ui.searchOpen" />
  </div>
</template>

<style scoped>
.sky-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  min-height: 0;
}

#sky {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  cursor: crosshair;
  display: block;
}

#const-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

:deep(.const-label) {
  position: absolute;
  transform: translate(-50%, -50%);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(100, 148, 230, 0.72);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

.key-hints {
  position: absolute;
  bottom: 38px;
  left: 16px;
  display: flex;
  gap: 14px;
  pointer-events: none;
  z-index: 20;
}

.key-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: rgba(90, 101, 133, 0.4);
}

.key-hint kbd {
  font-family: var(--font-mono);
  font-size: 9px;
  background: rgba(13, 15, 26, 0.75);
  border: 1px solid rgba(28, 32, 53, 0.9);
  border-radius: 3px;
  padding: 1px 5px;
  color: rgba(90, 101, 133, 0.6);
}


@media (max-width: 900px) {
  .key-hints { display: none; }
}

@media (max-width: 640px) {
  .demo-strip { display: none; }
}
</style>
