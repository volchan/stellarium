<script setup lang="ts">
import HudTop from "@/components/HudTop.vue";
import SkyCanvas from "@/components/SkyCanvas.vue";
import TooltipBar from "@/components/TooltipBar.vue";
import { useTelemetryStore } from "@/stores/telemetry";
import { useUiStore } from "@/stores/ui";
// biome-ignore lint: CJS default export
import tzFind from "@photostructure/tz-lookup";
import { onMounted, onUnmounted, ref } from "vue";

const telemetry = useTelemetryStore();
const ui = useUiStore();

const clockDisplay = ref("00:00:00.0");
const clockLabel = ref("UTC");

let tzLat = Number.NaN;
let tzLon = Number.NaN;

function tzAbbr(tz: string): string {
	const part = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" })
		.formatToParts(new Date())
		.find((p) => p.type === "timeZoneName");
	return part?.value ?? tz;
}

function updateTimezone(lat: number, lon: number) {
	if (Math.abs(lat - tzLat) < 0.5 && Math.abs(lon - tzLon) < 0.5) return;
	tzLat = lat;
	tzLon = lon;
	try {
		const tz = tzFind(lat, lon) ?? "UTC";
		telemetry.setTimezone(tz);
		clockLabel.value = tzAbbr(tz);
	} catch {
		telemetry.setTimezone("UTC");
		clockLabel.value = "UTC";
	}
}

function updateClock() {
	telemetry.zuluTime = Date.now() / 1000;
	const d = new Date(telemetry.zuluTime * 1000);
	const tz = telemetry.currentTz;
	const parts = new Intl.DateTimeFormat("en", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(d);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
	const f = Math.floor(d.getUTCMilliseconds() / 100);
	clockDisplay.value = `${get("hour")}:${get("minute")}:${get("second")}.${f}`;
	if (ui.coordsSet) updateTimezone(telemetry.lat, telemetry.lon);
}

let clockInterval: ReturnType<typeof setInterval> | null = null;

function onKeyDown(e: KeyboardEvent) {
	if ((document.activeElement as HTMLElement)?.tagName === "INPUT") return;
	if (e.key === "s" || e.key === "S") {
		ui.settingsOpen = !ui.settingsOpen;
		return;
	}
if (e.key === "Escape") {
		if (ui.settingsOpen) {
			ui.settingsOpen = false;
			return;
		}
		if (ui.pinnedStar) {
			ui.pinnedStar = null;
			return;
		}
		if (ui.coordsSet) ui.coordsSet = false;
	}
}

onMounted(() => {
	clockInterval = setInterval(updateClock, 100);
	document.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
	if (clockInterval) clearInterval(clockInterval);
	document.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <div class="app">
    <HudTop
      :clock-display="clockDisplay"
      :clock-label="clockLabel"
      @open-form="ui.coordsSet = false"
    />
    <SkyCanvas />
    <TooltipBar />
  </div>
</template>
