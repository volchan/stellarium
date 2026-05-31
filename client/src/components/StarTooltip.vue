<script setup lang="ts">
import { bvToColor } from "@/lib/astro";
import { useUiStore } from "@/stores/ui";
import { computed } from "vue";

const ui = useUiStore();

const star = computed(() => ui.hoveredStar);

function formatDist(parsecs: number): string {
	const ly = parsecs * 3.26156;
	if (ly < 100) return `${ly.toFixed(1)} ly`;
	if (ly < 10000) return `${Math.round(ly).toLocaleString()} ly`;
	return `${(ly / 1000).toFixed(1)}k ly`;
}

const style = computed(() => {
	if (!star.value) return {};
	const PAD = 16;
	const TW = 160;
	const TH = 64;
	let x = star.value.x + PAD;
	let y = star.value.y - TH / 2;
	if (x + TW > window.innerWidth - PAD) x = star.value.x - TW - PAD;
	if (y < 52) y = 52;
	if (y + TH > window.innerHeight - 40) y = window.innerHeight - 40 - TH;
	return { left: `${x}px`, top: `${y}px` };
});
</script>

<template>
  <Transition name="tt">
    <div v-if="star" class="star-tt" :style="style">
      <div class="tt-name">{{ star.star.proper ?? star.star.bf ?? (star.star.hip ? `HIP ${star.star.hip}` : '—') }}</div>
      <div class="tt-row">
        <span class="tt-dot" :style="{ background: bvToColor(star.star.ci) }"></span>
        <span class="tt-val">{{ star.star.spect ?? '—' }}</span>
        <span class="tt-sep">·</span>
        <span class="tt-val">{{ (star.star.mag < 0 ? '' : '+') + star.star.mag.toFixed(1) }}</span>
      </div>
      <div class="tt-row" v-if="star.star.dist || star.star.con">
        <span class="tt-val dim" v-if="star.star.dist">{{ formatDist(star.star.dist) }}</span>
        <span class="tt-sep" v-if="star.star.dist && star.star.con">·</span>
        <span class="tt-val dim" v-if="star.star.con">{{ star.star.con }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.star-tt {
  position: absolute;
  z-index: 200;
  background: rgba(9, 11, 19, 0.95);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(12px);
  min-width: 120px;
}

.tt-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin-bottom: 5px;
}

.tt-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
}

.tt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.tt-val {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-dim);
}
.tt-val.dim { color: var(--muted); }

.tt-sep { color: var(--border); font-size: 10px; }

.tt-enter-active,
.tt-leave-active { transition: opacity 80ms, transform 80ms; }
.tt-enter-from,
.tt-leave-to { opacity: 0; transform: translateY(3px); }
</style>
