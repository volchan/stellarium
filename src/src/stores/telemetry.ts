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

	function setTimezone(tz: string) {
		currentTz.value = tz;
	}

	function resetTime() {
		timeOffset.value = 0;
	}

	function stepTime(seconds: number) {
		timeOffset.value += seconds;
	}

	return { lat, lon, alt, headingTrue, pitch, zuluTime, currentTz, timeOffset, setTimezone, resetTime, stepTime };
});
