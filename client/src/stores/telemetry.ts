import { defineStore } from "pinia";
import { ref } from "vue";

export const useTelemetryStore = defineStore("telemetry", () => {
	const lat = ref(48.8566);
	const lon = ref(2.3522);
	const alt = ref(0);
	const headingTrue = ref(0);
	const pitch = ref(30);
	const zuluTime = ref(Date.now() / 1000);
	const currentTz = ref("UTC");
	const timeOffset = ref(0); // seconds offset from live time
	const timeSpeed  = ref(1); // playback speed multiplier (1 = realtime)

	function setTimezone(tz: string) {
		currentTz.value = tz;
	}

	function resetTime() {
		timeOffset.value = 0;
		timeSpeed.value  = 1;
	}

	function stepTime(seconds: number) {
		timeOffset.value += seconds;
	}

	function setSpeed(s: number) {
		timeSpeed.value = s;
	}

	return { lat, lon, alt, headingTrue, pitch, zuluTime, currentTz, timeOffset, timeSpeed, setTimezone, resetTime, stepTime, setSpeed };
});
