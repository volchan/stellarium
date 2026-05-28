<script setup lang="ts">
import { cn } from "@/lib/utils";
import { SeparatorRoot } from "radix-vue";

const props = defineProps<{
	orientation?: "horizontal" | "vertical";
	class?: string;
}>();
</script>

<template>
  <SeparatorRoot
    :orientation="orientation ?? 'horizontal'"
    :class="cn(
      'shrink-0',
      orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full',
      props.class
    )"
    style="background:var(--border);"
  />
</template>
