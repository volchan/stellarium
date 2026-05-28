<script setup lang="ts">
import { cn } from "@/lib/utils";
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from "radix-vue";

const props = defineProps<{
	modelValue?: number;
	min?: number;
	max?: number;
	step?: number;
	class?: string;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: number];
}>();

function onValueChange(val: number[]) {
	emit("update:modelValue", val[0]);
}
</script>

<template>
  <SliderRoot
    :model-value="[modelValue ?? 0]"
    :min="min ?? 0"
    :max="max ?? 100"
    :step="step ?? 1"
    :class="cn('relative flex items-center w-full select-none touch-none', props.class)"
    style="height:14px;"
    @update:model-value="onValueChange"
  >
    <SliderTrack
      style="
        position:relative;
        flex-grow:1;
        overflow:hidden;
        height:2px;
        background:var(--border);
        border-radius:1px;
        cursor:pointer;
      "
    >
      <SliderRange
        style="
          position:absolute;
          height:100%;
          background:var(--accent);
        "
      />
    </SliderTrack>
    <SliderThumb
      style="
        display:block;
        width:14px;
        height:14px;
        border-radius:50%;
        background:var(--accent);
        cursor:pointer;
        border:2px solid var(--bg);
        box-shadow:0 0 8px rgba(74,158,255,0.45);
        outline:none;
      "
    />
  </SliderRoot>
</template>
