<script setup lang="ts">
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
import { computed } from "vue";

const telemetry = useTelemetryStore();
const ui = useUiStore();

defineProps<{
	clockDisplay: string;
	clockLabel: string;
}>();

const emit = defineEmits<{
	openForm: [];
}>();

const isLive = computed(() => telemetry.timeOffset === 0 && telemetry.timeSpeed === 1);

const clockMeta = computed(() => {
	if (telemetry.timeSpeed !== 1) return `${telemetry.timeSpeed}×`;
	const s = Math.abs(telemetry.timeOffset);
	if (s === 0) return "UTC";
	const sign = telemetry.timeOffset >= 0 ? "+" : "−";
	if (s < 60) return `${sign}${Math.round(s)}s`;
	if (s < 3600) return `${sign}${Math.round(s / 60)}m`;
	if (s < 86400) return `${sign}${Math.round(s / 3600)}h`;
	return `${sign}${Math.round(s / 86400)}d`;
});

function formatLat(lat: number): string {
	return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
}
function formatLon(lon: number): string {
	return `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
}
</script>

<template>
  <header class="hud-top">
    <div class="hud-brand">
      <svg class="brand-icon" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L9.54 6.46H14.74L10.6 9.41L12.14 14.36L8 11.41L3.86 14.36L5.4 9.41L1.26 6.46H6.46L8 1.5Z" fill="currentColor"/>
      </svg>
      Stellarium
    </div>

    <div v-if="ui.coordsSet" class="hud-clock-wrap">
      <div class="hud-clock" :class="{ 'clock-offset': !isLive }">
        <span class="clock-label">{{ clockMeta }}</span>
        <span class="clock-value">{{ clockDisplay }}</span>
      </div>
    </div>

    <div class="hud-right">
      <div class="hud-data" v-if="ui.coordsSet">
        <div class="data-item">
          <span class="data-label">HDG</span>
          <span class="data-value">{{ String(((Math.round(ui.camera.az) % 360) + 360) % 360).padStart(3, '0') }}°T</span>
        </div>
        <span class="hud-sep">|</span>
        <div class="data-item">
          <span class="data-value dim">{{ formatLat(telemetry.lat) }}</span>
          <span class="data-value dim" style="margin-left:4px">{{ formatLon(telemetry.lon) }}</span>
        </div>
        <span class="hud-sep">|</span>
        <div class="data-item">
          <span class="data-label">ALT</span>
          <span class="data-value">{{ Math.round(telemetry.alt).toLocaleString() }} ft</span>
        </div>
      </div>
      <button
        class="hud-btn-form"
        type="button"
        @click="emit('openForm')"
      >{{ ui.coordsSet ? 'Change position' : 'Set position' }}</button>
      <button
        v-if="ui.coordsSet"
        class="hud-btn-settings"
        type="button"
        title="Search (/ or F)"
        @click="ui.searchOpen = true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <button
        v-if="ui.coordsSet"
        class="hud-btn-settings"
        type="button"
        :title="ui.settingsOpen ? 'Close settings' : 'Settings'"
        @click="ui.settingsOpen = !ui.settingsOpen"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.hud-top {
  flex: none;
  height: 44px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  z-index: 100;
  user-select: none;
}

.hud-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.brand-icon { width: 16px; height: 16px; opacity: 0.55; flex: none; }

.hud-clock-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud-clock {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 2px 6px;
}

.clock-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  transition: color var(--motion-fast);
}

.clock-value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 300;
  letter-spacing: 0.04em;
  color: var(--fg);
  text-shadow: 0 0 28px rgba(74, 158, 255, 0.3);
  font-variant-numeric: tabular-nums;
  transition: color var(--motion-fast), text-shadow var(--motion-fast);
}

.hud-clock.clock-offset .clock-label { color: var(--accent-warm); }
.hud-clock.clock-offset .clock-value {
  color: var(--accent-warm);
  text-shadow: 0 0 28px rgba(255, 160, 50, 0.35);
}

.hud-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.hud-data {
  display: flex;
  align-items: center;
  gap: 12px;
}

.data-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.data-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.data-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--accent-warm);
  letter-spacing: 0.02em;
}
.data-value.dim { color: var(--fg-dim); }

.hud-sep { color: var(--border); font-size: 15px; line-height: 1; }

.hud-btn-form {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  cursor: pointer;
  transition: color var(--motion-fast), border-color var(--motion-fast);
}
.hud-btn-form:hover { color: var(--fg); border-color: var(--muted); }

.hud-btn-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
  transition: color var(--motion-fast), border-color var(--motion-fast);
  flex: none;
}
.hud-btn-settings:hover { color: var(--fg); border-color: var(--muted); }

@media (max-width: 640px) {
  .hud-top {
    grid-template-columns: auto 1fr;
    padding: 0 10px;
    height: 40px;
    gap: 6px;
  }
  .hud-brand { display: none; }
  .clock-label { display: none; }
  .clock-value { font-size: 16px; letter-spacing: 0.02em; }
  .hud-right { gap: 8px; }
  .hud-btn-form { padding: 3px 7px; font-size: 8px; }
}

@media (max-width: 900px) {
  .hud-data { display: none; }
}

@media (max-width: 400px) {
  .clock-value { font-size: 14px; }
  .hud-btn-form { display: none; }
}
</style>
