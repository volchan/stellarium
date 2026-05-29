import { defineStore } from "pinia";
import { ref } from "vue";

export interface SavedPosition {
	id: string;
	label: string;
	lat: number;
	lon: number;
	alt: number;
	hdg: number;
	savedAt: number;
}

const STORAGE_KEY = "stellarium:positions";
const MAX = 20;

function load(): SavedPosition[] {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
	} catch {
		return [];
	}
}

function save(positions: SavedPosition[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export const usePositionsStore = defineStore("positions", () => {
	const positions = ref<SavedPosition[]>(load());

	function add(entry: Omit<SavedPosition, "id" | "savedAt">) {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		positions.value.unshift({ ...entry, id, savedAt: Date.now() });
		if (positions.value.length > MAX) positions.value.length = MAX;
		save(positions.value);
	}

	function remove(id: string) {
		positions.value = positions.value.filter((p) => p.id !== id);
		save(positions.value);
	}

	return { positions, add, remove };
});
