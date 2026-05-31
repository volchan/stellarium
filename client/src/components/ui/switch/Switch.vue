<script setup lang="ts">
import { cn } from "@/lib/utils";
import { SwitchRoot, SwitchThumb } from "radix-vue";

const props = defineProps<{
	modelValue?: boolean;
	class?: string;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
}>();
</script>

<template>
  <SwitchRoot
    :checked="modelValue"
    :class="cn('tog relative cursor-pointer', props.class)"
    style="width:32px;height:18px;flex:none;border:none;padding:0;background:none;"
    @update:checked="emit('update:modelValue', $event)"
  >
    <div
      class="tog-track"
      :style="{
        position: 'absolute',
        inset: '0',
        background: modelValue ? 'var(--accent)' : 'var(--surface-2)',
        border: modelValue ? '1px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: '9px',
        transition: 'background var(--motion-fast), border-color var(--motion-fast)',
      }"
    />
    <SwitchThumb
      :style="{
        position: 'absolute',
        top: '3px',
        left: '3px',
        width: '10px',
        height: '10px',
        background: modelValue ? '#fff' : 'rgba(255,255,255,0.5)',
        borderRadius: '50%',
        transition: 'transform var(--motion-fast), background var(--motion-fast)',
        transform: modelValue ? 'translateX(14px)' : 'translateX(0)',
        pointerEvents: 'none',
        display: 'block',
      }"
    />
  </SwitchRoot>
</template>
