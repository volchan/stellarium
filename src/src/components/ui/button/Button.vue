<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = withDefaults(
	defineProps<{
		variant?: "default" | "ghost" | "icon";
		class?: string;
	}>(),
	{ variant: "default" },
);

const base =
	"inline-flex items-center justify-center cursor-pointer border-none rounded transition-all duration-[140ms] font-semibold text-xs";
const variants: Record<string, string> = {
	default:
		"bg-[var(--accent)] text-white px-[18px] py-2 hover:bg-[color-mix(in_oklch,var(--accent),black_10%)]",
	ghost:
		"bg-transparent text-[var(--muted)] border border-[var(--border)] px-[18px] py-2 hover:text-[var(--fg)] hover:border-[var(--muted)]",
	icon: "bg-transparent text-[var(--muted)] p-[3px] rounded hover:text-[var(--fg)] w-auto h-auto",
};
</script>

<template>
  <button :class="cn(base, variants[variant], props.class)" v-bind="$attrs">
    <slot />
  </button>
</template>
