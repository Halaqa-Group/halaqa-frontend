<script setup lang="ts">
defineProps<{ label: string }>()

// Tap the number (or +) to increment; − to decrement. Mobile-first, but works
// with mouse too. Clamped at 0.
const model = defineModel<number>({ required: true })

function inc() {
  model.value = (model.value ?? 0) + 1
}
function dec() {
  const v = model.value ?? 0
  if (v > 0) model.value = v - 1
}
</script>

<template>
  <div class="flex flex-col gap-1 rounded-lg border border-default bg-default p-1.5 select-none">
    <span class="text-[11px] text-muted text-center leading-tight">{{ label }}</span>
    <div class="flex items-center gap-0.5">
      <UButton
        icon="i-lucide-minus"
        size="xs"
        color="neutral"
        variant="soft"
        square
        :disabled="(model ?? 0) <= 0"
        :aria-label="`${label} −`"
        @click="dec"
      />
      <button
        type="button"
        class="flex-1 rounded-md py-0.5 text-center text-lg font-bold tabular-nums transition hover:bg-elevated active:bg-elevated active:scale-95"
        :aria-label="`${label} +`"
        @click="inc"
      >
        {{ model ?? 0 }}
      </button>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        color="primary"
        variant="soft"
        square
        :aria-label="`${label} +`"
        @click="inc"
      />
    </div>
  </div>
</template>
