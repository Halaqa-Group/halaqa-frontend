<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const { locale } = useI18n()
const { buildDateStrip } = useAttendance()

const days = computed(() => buildDateStrip(locale.value, 14))

function onPick(iso: string) {
  emit('update:modelValue', iso)
}

function rateColor(rate: number | null) {
  if (rate === null) return null
  if (rate >= 80) return {
    bg: 'var(--color-track-hifz-bg)',
    text: 'var(--color-track-hifz)',
    dot: 'var(--color-track-hifz)'
  }
  if (rate >= 50) return {
    bg: 'var(--color-track-far-bg)',
    text: 'var(--color-track-far)',
    dot: 'var(--color-track-far)'
  }
  return {
    bg: 'var(--color-track-near-bg)',
    text: 'var(--color-track-near)',
    dot: 'var(--color-track-near)'
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex-1 min-w-0 overflow-x-auto">
      <div class="flex items-stretch gap-2 py-1">
        <button
          v-for="day in days"
          :key="day.iso"
          type="button"
          :disabled="day.isFuture"
          :aria-pressed="day.iso === modelValue"
          class="shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-2 min-w-[60px] sm:min-w-[64px] cursor-pointer transition-all duration-200 ease-out border"
          :class="[
            day.isFuture && 'opacity-40 cursor-not-allowed',
            day.iso === modelValue
              ? 'bg-primary text-on-primary border-primary shadow-md scale-[1.02]'
              : day.isToday
                ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary/30 hover:-translate-y-0.5'
          ]"
          :style="
            day.iso !== modelValue && !day.isToday && rateColor(day.rate)
              ? { backgroundColor: rateColor(day.rate)!.bg, color: rateColor(day.rate)!.text, borderColor: 'transparent' }
              : undefined
          "
          @click="!day.isFuture && onPick(day.iso)"
        >
          <span
            class="text-[11px] font-semibold uppercase tracking-wide leading-tight"
            :class="day.iso === modelValue ? 'opacity-90' : 'opacity-70'"
          >
            {{ day.dayName }}
          </span>
          <span
            class="text-lg font-bold leading-none"
          >
            {{ day.dayNumber }}
          </span>
          <span
            v-if="day.isToday && day.iso !== modelValue"
            class="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"
          />
          <span
            v-else-if="day.rate !== null && day.iso !== modelValue"
            class="w-1.5 h-1.5 rounded-full mt-0.5"
            :style="{ backgroundColor: rateColor(day.rate)!.dot }"
          />
        </button>
      </div>
    </div>

    <slot name="trigger" />
  </div>
</template>
