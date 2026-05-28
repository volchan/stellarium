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

	function setTimezone(tz: string) {
		currentTz.value = tz;
	}

	return { lat, lon, alt, headingTrue, pitch, zuluTime, currentTz, setTimezone };
});
