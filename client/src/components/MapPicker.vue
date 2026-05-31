<script setup lang="ts">
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { ref } from "vue";

const props = defineProps<{
	lat: number;
	lon: number;
	visible?: boolean;
}>();

const emit = defineEmits<{
	pick: [payload: { lat: number; lon: number }];
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: L.Map | null = null;
let marker: L.Marker | null = null;

L.Icon.Default.prototype.options.iconUrl = markerIcon;
L.Icon.Default.prototype.options.shadowUrl = markerShadow;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIcon;

onMounted(() => {
	if (mapInstance || !mapContainer.value) return;

	mapInstance = L.map(mapContainer.value, {
		zoomControl: true,
		attributionControl: true,
	}).setView([props.lat, props.lon], 5);

	L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
		subdomains: ["a", "b", "c", "d"],
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
		maxZoom: 19,
	}).addTo(mapInstance);

	marker = L.marker([props.lat, props.lon], { draggable: true }).addTo(mapInstance);

	marker.on("dragend", () => {
		if (!marker) return;
		const pos = marker.getLatLng();
		emit("pick", { lat: pos.lat, lon: pos.lng });
	});

	mapInstance.on("click", (e: L.LeafletMouseEvent) => {
		const { lat, lng } = e.latlng;
		marker?.setLatLng([lat, lng]);
		emit("pick", { lat, lon: lng });
	});
});

watch(
	() => props.visible,
	async (val) => {
		if (val) {
			await nextTick();
			setTimeout(() => {
				mapInstance?.invalidateSize();
			}, 0);
		}
	},
);

onBeforeUnmount(() => {
	if (mapInstance) {
		mapInstance.remove();
		mapInstance = null;
		marker = null;
	}
});
</script>

<template>
  <div ref="mapContainer" class="map-picker" data-testid="map-picker"></div>
</template>

<style scoped>
.map-picker {
  width: 100%;
  height: clamp(280px, 40vh, 480px);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
</style>

<style>
@import 'leaflet/dist/leaflet.css';
</style>
