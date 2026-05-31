<script setup lang="ts">
import Slider from "@/components/ui/slider/Slider.vue";
import Switch from "@/components/ui/switch/Switch.vue";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { computed } from "vue";

const settings = useSettingsStore();
const ui = useUiStore();

const props = defineProps<{
	starsCount: number;
	constsCount: number;
}>();
</script>

<template>
  <aside :class="['settings-panel', ui.settingsOpen ? 'open' : '']" data-testid="settings-panel">
    <div class="sp-header">
      <span class="sp-title">Settings</span>
      <button class="btn-icon" type="button" @click="ui.settingsOpen = false">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="sp-section">
      <div class="sp-section-label">Display</div>
      <div class="toggle-row">
        <span class="toggle-text">Constellation lines</span>
        <Switch v-model="settings.constLines" data-testid="toggle-const-lines" />
      </div>
      <div class="toggle-row">
        <span class="toggle-text">Constellation names</span>
        <Switch v-model="settings.constNames" />
      </div>
      <div class="toggle-row">
        <span class="toggle-text">Star labels</span>
        <Switch v-model="settings.starLabels" />
      </div>
      <div class="toggle-row">
        <span class="toggle-text">Sun</span>
        <Switch v-model="settings.showSun" />
      </div>
      <div class="toggle-row">
        <span class="toggle-text">Moon</span>
        <Switch v-model="settings.showMoon" />
      </div>

    </div>

    <div class="sp-section">
      <div class="sp-section-label">View</div>
      <div class="sl-row" style="margin-bottom:18px">
        <div class="sl-meta">
          <span class="sl-label">Magnitude limit</span>
          <span class="sl-val">{{ settings.mag.toFixed(1) }}</span>
        </div>
        <Slider v-model="settings.mag" :min="3.0" :max="6.5" :step="0.1" />
      </div>
      <div class="sl-row">
        <div class="sl-meta">
          <span class="sl-label">Field of view</span>
          <span class="sl-val">{{ Math.round(settings.fov) }}°</span>
        </div>
        <Slider v-model="settings.fov" :min="10" :max="180" :step="5" />
      </div>
    </div>

    <div class="sp-section">
      <div class="sp-section-label">Catalog</div>
      <div class="kv-grid">
        <div class="kv-row"><span class="kv-k">Stars loaded</span><span class="kv-v">{{ starsCount > 0 ? starsCount.toLocaleString() : '—' }}</span></div>
        <div class="kv-row"><span class="kv-k">Constellations</span><span class="kv-v">{{ constsCount > 0 ? `${constsCount} IAU` : '—' }}</span></div>
        <div class="kv-row"><span class="kv-k">Source</span><span class="kv-v">HYG v4.1</span></div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.settings-panel {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 272px;
  background: rgba(9, 11, 19, 0.98);
  border-left: 1px solid var(--border);
  z-index: 200;
  transform: translateX(100%);
  transition: transform var(--motion-base) var(--ease-out);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  backdrop-filter: blur(20px);
}
.settings-panel.open { transform: translateX(0); }

.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border);
  flex: none;
}

.sp-title {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
  padding: 3px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--motion-fast);
}
.btn-icon:hover { color: var(--fg); }

.sp-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex: none;
}

.sp-section-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 11px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  gap: 8px;
}
.toggle-text { font-size: 12px; color: var(--fg-dim); }

.sl-row { margin-bottom: 4px; }
.sl-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 9px; }
.sl-label { font-size: 12px; color: var(--fg-dim); }
.sl-val { font-family: var(--font-mono); font-size: 11px; color: var(--accent); }

.seg-ctrl {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: 10px;
}
.seg-btn {
  flex: 1;
  background: none; border: none;
  padding: 8px 0;
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  color: var(--muted);
  cursor: pointer;
  transition: all var(--motion-fast);
}
.seg-btn.active { background: var(--accent); color: #fff; }
.seg-btn + .seg-btn { border-left: 1px solid var(--border); }

.kv-grid { display: grid; gap: 7px; margin-top: 6px; }
.kv-row { display: flex; justify-content: space-between; align-items: baseline; }
.kv-k { font-size: 11px; color: var(--muted); }
.kv-v { font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); }

@media (max-width: 640px) {
  .settings-panel { width: min(88vw, 300px); }
}
</style>
