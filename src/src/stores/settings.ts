import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
	const constLines = ref(true);
	const constNames = ref(true);
	const starLabels = ref(true);
	const mag = ref(6.5);
	const fov = ref(90);
	const showSun = ref(true);
	const showMoon = ref(true);
	return { constLines, constNames, starLabels, mag, fov, showSun, showMoon };
});
