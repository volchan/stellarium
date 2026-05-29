<script setup lang="ts">
import { useTelemetryStore } from "@/stores/telemetry";
import { computed } from "vue";

const telemetry = useTelemetryStore();

const isLive = computed(() => telemetry.timeOffset === 0 && telemetry.timeSpeed === 1);

const SPEEDS = [1, 10, 100, 1000];
</script>

<template>
  <div class="time-controls">
    <!-- Speed row -->
    <div class="tc-row">
      <span class="tc-section-label">Speed</span>
      <div class="tc-speed-group">
        <button
          v-for="s in SPEEDS"
          :key="s"
          class="tc-btn tc-speed"
          :class="{ active: telemetry.timeSpeed === s && !isLive || (s === 1 && telemetry.timeSpeed === 1) }"
          type="button"
          :title="`${s}× speed`"
          @click="telemetry.setSpeed(s)"
        >{{ s }}×</button>
      </div>
    </div>

    <!-- Step + Now row -->
    <div class="tc-row">
      <button class="tc-btn" type="button" title="−1 day"   @click="telemetry.stepTime(-86400)">−1d</button>
      <button class="tc-btn" type="button" title="−6 hours" @click="telemetry.stepTime(-21600)">−6h</button>
      <button class="tc-btn" type="button" title="−1 hour"  @click="telemetry.stepTime(-3600)">−1h</button>
      <button class="tc-btn" type="button" title="−10 min"  @click="telemetry.stepTime(-600)">−10m</button>
      <button
        class="tc-btn tc-now"
        type="button"
        title="Return to live time"
        :disabled="isLive"
        @click="telemetry.resetTime()"
      >Now</button>
      <button class="tc-btn" type="button" title="+10 min"  @click="telemetry.stepTime(600)">+10m</button>
      <button class="tc-btn" type="button" title="+1 hour"  @click="telemetry.stepTime(3600)">+1h</button>
      <button class="tc-btn" type="button" title="+6 hours" @click="telemetry.stepTime(21600)">+6h</button>
      <button class="tc-btn" type="button" title="+1 day"   @click="telemetry.stepTime(86400)">+1d</button>
    </div>
  </div>
</template>

<style scoped>
.time-controls {
  position: absolute;
  bottom: 8px;
  right: 16px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  pointer-events: auto;
}

.tc-row {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(9, 11, 19, 0.88);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px 6px;
  backdrop-filter: blur(14px);
}

.tc-section-label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(90, 101, 133, 0.45);
  padding-right: 4px;
}

.tc-speed-group {
  display: flex;
  gap: 2px;
}

.tc-btn {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 3px 6px;
  cursor: pointer;
  transition: color var(--motion-fast), border-color var(--motion-fast), background var(--motion-fast);
  line-height: 1;
}
.tc-btn:hover {
  color: var(--fg);
  border-color: var(--border);
  background: rgba(255,255,255,0.04);
}

.tc-speed.active {
  color: var(--fg);
  border-color: rgba(74, 158, 255, 0.45);
  background: rgba(74, 158, 255, 0.1);
}

.tc-now {
  color: var(--accent);
  border-color: rgba(74, 158, 255, 0.3);
  background: rgba(74, 158, 255, 0.06);
  margin: 0 2px;
}
.tc-now:hover { background: rgba(74, 158, 255, 0.14); border-color: var(--accent); }
.tc-now:disabled { opacity: 0.28; cursor: default; pointer-events: none; }

@media (max-width: 640px) {
  .time-controls {
    right: 8px;
    bottom: 6px;
  }
  .tc-row { padding: 3px 5px; gap: 1px; }
  .tc-btn { padding: 3px 4px; font-size: 8px; }
  .tc-section-label { display: none; }
}

@media (max-width: 400px) {
  .tc-row:first-child { display: none; }
}
</style>
