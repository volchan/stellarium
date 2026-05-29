<script setup lang="ts">
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import { ref } from "vue";

const telemetry = useTelemetryStore();
const ui = useUiStore();

const latInput = ref("");
const lonInput = ref("");
const altInput = ref("");
const hdgInput = ref("");

function onSubmit() {
	const lat = Number.parseFloat(latInput.value);
	const lon = Number.parseFloat(lonInput.value);
	if (Number.isNaN(lat) || Number.isNaN(lon)) return;
	const altFt = Number.parseFloat(altInput.value) || 0;
	const hdg =
		hdgInput.value !== ""
			? ((Number.parseFloat(hdgInput.value) % 360) + 360) % 360
			: telemetry.headingTrue;

	telemetry.lat = lat;
	telemetry.lon = lon;
	telemetry.alt = altFt;
	telemetry.headingTrue = hdg;
	ui.camera.az = hdg;
	ui.camera.alt = 30;
	ui.coordsSet = true;
}
</script>

<template>
  <div :class="['disc-overlay', !ui.coordsSet ? 'visible' : '']">
    <svg class="disc-icon" width="36" height="36" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <div class="disc-title">Set Observer Position</div>
    <div class="disc-sub">
      Enter your coordinates to render the sky at your location.
    </div>
    <form class="coord-form" autocomplete="off" @submit.prevent="onSubmit">
      <div class="coord-fields">
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
  </div>
</template>

<style scoped>
.disc-overlay {
  position: absolute; inset: 0;
  background: rgba(7, 8, 15, 0.92);
  backdrop-filter: blur(8px);
  z-index: 300;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
  opacity: 0; pointer-events: none;
  transition: opacity var(--motion-base);
}
.disc-overlay.visible { opacity: 1; pointer-events: auto; }

.disc-icon { color: var(--accent); opacity: 0.7; }
.disc-title { font-size: 20px; font-weight: 700; color: var(--fg); text-align: center; letter-spacing: -0.01em; }
.disc-sub {
  font-size: 13px; color: var(--muted);
  text-align: center; max-width: 340px;
  line-height: 1.7;
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

.coord-form { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 16px; margin-top: 4px; }
.coord-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.coord-field { display: flex; flex-direction: column; gap: 5px; }
.coord-label {
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--muted);
}
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
}
.coord-inp::-webkit-outer-spin-button,
.coord-inp::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.coord-inp::placeholder { color: var(--muted); opacity: 0.6; }
.coord-inp:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.18); }
.coord-actions { display: flex; justify-content: center; }

@media (max-width: 640px) {
  .disc-overlay {
    padding: 32px 16px 24px;
    justify-content: flex-start;
    overflow-y: auto;
    gap: 12px;
  }
  .disc-title { font-size: 17px; }
  .disc-sub { font-size: 12px; }
  .coord-form { max-width: 100%; }
  .coord-actions .btn-primary { width: 100%; }
}

@media (max-width: 400px) {
  .coord-fields { grid-template-columns: 1fr; }
}
</style>
