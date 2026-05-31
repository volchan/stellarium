<script setup lang="ts">
</script>

<template>
  <footer class="hud-bottom">
    <div class="tt-hint">
      Hover a star · <kbd>Click</kbd> to pin · <kbd>S</kbd> settings
    </div>
  </footer>
</template>

<style scoped>
.hud-bottom {
  flex: none;
  height: 32px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 16px; gap: 6px;
  z-index: 100;
  font-family: var(--font-mono);
  font-size: 11px;
  overflow: hidden;
  user-select: none;
}
.tt-name { font-weight: 600; color: var(--fg); }
.tt-bayer { color: var(--accent); margin-left: 6px; }
.tt-sep { color: var(--border); margin: 0 4px; }
.tt-val { color: var(--muted); }
.tt-val strong { color: var(--fg-dim); font-weight: 500; }
.tt-hint { color: rgba(90, 101, 133, 0.5); }
.tt-hint kbd {
  font-family: var(--font-mono); font-size: 9px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 3px; padding: 1px 4px; color: var(--muted); margin: 0 2px;
}

@media (max-width: 640px) {
  .hud-bottom { height: 28px; padding: 0 10px; font-size: 10px; }
}
</style>
