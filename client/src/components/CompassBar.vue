<script setup lang="ts">
import { useUiStore } from "@/stores/ui";
import { onMounted, onUnmounted, ref } from "vue";

const ui = useUiStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

const PPD = 10; // pixels per degree

const CARDINALS: Record<number, string> = {
	0: "N", 45: "NE", 90: "E", 135: "SE",
	180: "S", 225: "SW", 270: "W", 315: "NW",
};

let raf = 0;
let dpr = 1;
let W = 0;
let H = 0;

function draw() {
	const canvas = canvasRef.value;
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	ctx.scale(dpr, dpr);

	const az = ui.camera.az;
	const cx = W / 2;

	// Background
	ctx.fillStyle = "rgba(7, 8, 15, 0.82)";
	ctx.fillRect(0, 0, W, H);

	// Bottom border
	ctx.strokeStyle = "rgba(28, 32, 53, 0.9)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, H);
	ctx.lineTo(W, H);
	ctx.stroke();

	// Ticks + labels
	const halfSpan = Math.ceil(W / PPD / 2) + 2;
	const centerDeg = Math.round(az);

	for (let offset = -halfSpan; offset <= halfSpan; offset++) {
		const deg = ((centerDeg + offset) % 360 + 360) % 360;
		const x = cx + (offset - (az - centerDeg)) * PPD;

		const isCardinal = deg % 45 === 0;
		const isMajor = deg % 10 === 0;
		const isMinor = deg % 5 === 0;

		if (!isMinor && !isMajor) continue;

		// Tick
		const tickH = isCardinal ? 12 : isMajor ? 8 : 5;
		ctx.strokeStyle = isCardinal ? "rgba(74, 158, 255, 0.7)" : "rgba(90, 101, 133, 0.45)";
		ctx.lineWidth = isCardinal ? 1.5 : 1;
		ctx.beginPath();
		ctx.moveTo(x, H - tickH - 1);
		ctx.lineTo(x, H - 1);
		ctx.stroke();

		// Label
		if (isCardinal) {
			const label = CARDINALS[deg];
			ctx.fillStyle = deg === 0 ? "rgba(74, 158, 255, 0.95)" : "rgba(160, 180, 230, 0.85)";
			ctx.font = `700 11px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.fillText(label, x, H - tickH - 5);
		} else if (isMajor) {
			ctx.fillStyle = "rgba(90, 101, 133, 0.55)";
			ctx.font = `500 9px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.fillText(String(deg).padStart(3, "0"), x, H - tickH - 4);
		}
	}

	// Center arrow (fixed, pointing down)
	const arrowY = 6;
	ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
	ctx.beginPath();
	ctx.moveTo(cx, arrowY + 7);
	ctx.lineTo(cx - 5, arrowY);
	ctx.lineTo(cx + 5, arrowY);
	ctx.closePath();
	ctx.fill();

	// Current degree readout under arrow
	const displayAz = ((Math.round(az) % 360) + 360) % 360;
	ctx.fillStyle = "rgba(255,255,255,0.75)";
	ctx.font = "600 9px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.fillText(String(displayAz).padStart(3, "0") + "°", cx, H - 16);

	ctx.restore();
	raf = requestAnimationFrame(draw);
}

function resize() {
	const canvas = canvasRef.value;
	if (!canvas) return;
	dpr = window.devicePixelRatio || 1;
	W = canvas.offsetWidth;
	H = canvas.offsetHeight;
	canvas.width = W * dpr;
	canvas.height = H * dpr;
}

onMounted(() => {
	window.addEventListener("resize", resize);
	resize();
	raf = requestAnimationFrame(draw);
});

onUnmounted(() => {
	cancelAnimationFrame(raf);
	window.removeEventListener("resize", resize);
});
</script>

<template>
  <canvas ref="canvasRef" class="compass-bar" />
</template>

<style scoped>
.compass-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 48px;
  z-index: 50;
  pointer-events: none;
  display: block;
}
</style>
