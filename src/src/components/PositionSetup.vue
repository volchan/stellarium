<script setup lang="ts">
import { usePositionsStore } from "@/stores/positions";
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import { computed, ref } from "vue";

const telemetry = useTelemetryStore();
const ui = useUiStore();
const posStore = usePositionsStore();

const labelInput = ref("");
const latInput = ref("");
const lonInput = ref("");
const altInput = ref("");
const hdgInput = ref("");

const hasSaved = computed(() => posStore.positions.length > 0);

function applyPosition(lat: number, lon: number, alt: number, hdg: number) {
	telemetry.lat = lat;
	telemetry.lon = lon;
	telemetry.alt = alt;
	telemetry.headingTrue = hdg;
	ui.camera.az = hdg;
	ui.camera.alt = 30;
	ui.coordsSet = true;
}

function onSubmit() {
	const lat = Number.parseFloat(latInput.value);
	const lon = Number.parseFloat(lonInput.value);
	if (Number.isNaN(lat) || Number.isNaN(lon)) return;
	const alt = Number.parseFloat(altInput.value) || 0;
	const hdg = hdgInput.value !== ""
		? ((Number.parseFloat(hdgInput.value) % 360) + 360) % 360
		: telemetry.headingTrue;

	const rawLabel = labelInput.value.trim();
	const label = rawLabel || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

	posStore.add({ label, lat, lon, alt, hdg });
	applyPosition(lat, lon, alt, hdg);
}

function loadSaved(id: string) {
	const p = posStore.positions.find((x) => x.id === id);
	if (!p) return;
	labelInput.value = p.label;
	latInput.value = String(p.lat);
	lonInput.value = String(p.lon);
	altInput.value = String(p.alt);
	hdgInput.value = String(p.hdg);
}

function applySaved(id: string) {
	const p = posStore.positions.find((x) => x.id === id);
	if (!p) return;
	applyPosition(p.lat, p.lon, p.alt, p.hdg);
}

function formatCoords(lat: number, lon: number): string {
	const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
	const lo = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
	return `${la}  ${lo}`;
}
</script>

<template>
  <div :class="['position-setup', !ui.coordsSet ? 'visible' : '']">
    <img class="ps-icon" src="/icon.svg" alt="" aria-hidden="true" />
    <div class="ps-title">Set Observer Position</div>
    <div class="ps-sub">
      Enter your coordinates to render the sky at your location.
    </div>

    <form class="coord-form" autocomplete="off" @submit.prevent="onSubmit">
      <div class="coord-fields">
        <div class="coord-field coord-field--full">
          <label class="coord-label" for="inp-label">Label <span class="coord-opt">(optional)</span></label>
          <input v-model="labelInput" class="coord-inp" id="inp-label" type="text" maxlength="40" placeholder="Home, Paris, Observatory…">
        </div>
        <div class="coord-field">
          <label class="coord-label" for="inp-lat">Latitude</label>
          <input v-model="latInput" class="coord-inp" id="inp-lat" type="number" step="any" min="-90" max="90" placeholder="48.8566" required>
        </div>
        <div class="coord-field">
          <label class="coord-label" for="inp-lon">Longitude</label>
          <input v-model="lonInput" class="coord-inp" id="inp-lon" type="number" step="any" min="-180" max="180" placeholder="2.3522" required>
        </div>
        <div class="coord-field">
          <label class="coord-label" for="inp-alt">Altitude (ft)</label>
          <input v-model="altInput" class="coord-inp" id="inp-alt" type="number" step="1" min="0" max="60000" placeholder="0">
        </div>
        <div class="coord-field">
          <label class="coord-label" for="inp-hdg">Heading (°)</label>
          <input v-model="hdgInput" class="coord-inp" id="inp-hdg" type="number" step="1" min="0" max="359" placeholder="0">
        </div>
      </div>
      <div class="coord-actions">
        <button class="btn-primary" type="submit">Render Sky</button>
      </div>
    </form>

    <!-- Saved positions -->
    <div v-if="hasSaved" class="saved-section">
      <div class="saved-header">Recent positions</div>
      <ul class="saved-list">
        <li v-for="p in posStore.positions" :key="p.id" class="saved-item">
          <button class="saved-body" type="button" @click="applySaved(p.id)">
            <span class="saved-label">{{ p.label }}</span>
            <span class="saved-coords">{{ formatCoords(p.lat, p.lon) }}</span>
          </button>
          <button class="saved-load" type="button" title="Load into form" @click="loadSaved(p.id)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 6h8M6 2l4 4-4 4"/>
            </svg>
          </button>
          <button class="saved-del" type="button" title="Delete" @click="posStore.remove(p.id)">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M1 1l8 8M9 1L1 9"/>
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.position-setup {
  position: absolute; inset: 0;
  background: rgba(7, 8, 15, 0.92);
  backdrop-filter: blur(8px);
  z-index: 300;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  padding: 40px 16px 32px;
  gap: 14px;
  opacity: 0; pointer-events: none;
  transition: opacity var(--motion-base);
  overflow-y: auto;
}
.position-setup.visible { opacity: 1; pointer-events: auto; }

.ps-icon { width: 52px; height: 52px; flex: none; }
.ps-title { font-size: 20px; font-weight: 700; color: var(--fg); text-align: center; letter-spacing: -0.01em; flex: none; }
.ps-sub {
  font-size: 13px; color: var(--muted);
  text-align: center; max-width: 340px;
  line-height: 1.7;
  flex: none;
}

.btn-primary {
  background: var(--accent); color: #fff;
  border: none; border-radius: var(--radius-sm);
  padding: 8px 24px;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  transition: background var(--motion-fast);
}
.btn-primary:hover { background: color-mix(in oklch, var(--accent), black 10%); }

.coord-form { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 16px; flex: none; }
.coord-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.coord-field { display: flex; flex-direction: column; gap: 5px; }
.coord-field--full { grid-column: span 2; }
.coord-label {
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted);
}
.coord-opt { font-weight: 400; opacity: 0.6; text-transform: none; letter-spacing: 0; }
.coord-inp {
  background: rgba(13, 15, 26, 0.9);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg);
  width: 100%;
  outline: none;
  transition: border-color var(--motion-fast);
  -moz-appearance: textfield;
  appearance: textfield;
}
.coord-inp::-webkit-outer-spin-button,
.coord-inp::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }
.coord-inp::placeholder { color: var(--muted); opacity: 0.6; }
.coord-inp:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.18); }
.coord-actions { display: flex; justify-content: center; }

/* Saved positions */
.saved-section {
  width: 100%;
  max-width: 360px;
  flex: none;
}

.saved-header {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
  padding-left: 2px;
}

.saved-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.saved-item {
  display: flex;
  align-items: stretch;
  background: rgba(13, 15, 26, 0.7);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color var(--motion-fast);
}
.saved-item:hover { border-color: rgba(74, 158, 255, 0.3); }

.saved-body {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 10px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  min-width: 0;
}

.saved-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.saved-coords {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
  flex: none;
}

.saved-load,
.saved-del {
  flex: none;
  background: none;
  border: none;
  border-left: 1px solid var(--border);
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(90, 101, 133, 0.5);
  transition: color var(--motion-fast), background var(--motion-fast);
}
.saved-load:hover { color: var(--accent); background: rgba(74, 158, 255, 0.07); }
.saved-del:hover  { color: #e05555; background: rgba(220, 60, 60, 0.07); }

@media (max-width: 640px) {
  .position-setup { padding: 28px 16px 24px; gap: 12px; }
  .ps-title { font-size: 17px; }
  .ps-sub { font-size: 12px; }
  .coord-form, .saved-section { max-width: 100%; }
  .coord-actions .btn-primary { width: 100%; }
  .saved-coords { display: none; }
}

@media (max-width: 400px) {
  .coord-fields { grid-template-columns: 1fr; }
  .coord-field--full { grid-column: span 1; }
}
</style>
