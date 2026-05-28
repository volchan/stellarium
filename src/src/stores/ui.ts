import type { VisibleStar } from "@/lib/renderer";
import { defineStore } from "pinia";
import { reactive, ref } from "vue";

export const useUiStore = defineStore("ui", () => {
	const settingsOpen = ref(false);
	const coordsSet = ref(false);
	const pinnedStar = ref<VisibleStar | null>(null);
	const hoveredStar = ref<VisibleStar | null>(null);
	const camera = reactive({ az: 0, alt: 30 });
	return { settingsOpen, coordsSet, pinnedStar, hoveredStar, camera };
});
