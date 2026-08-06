<script setup lang="ts" generic="T extends string | number">
// A single-column wheel select — the CommonWheelPicker styling applied to a plain
// one-value choice (e.g. picking a student), with the same mobile collapse-to-a-
// card behaviour as the surah/ayah range wheels.
const props = withDefaults(defineProps<{
  items: { label: string, value: T }[]
  // Mobile: collapse to a one-line summary you tap to open. Always-on ≥sm.
  collapsible?: boolean
  ariaLabel?: string
  // Shown in the collapsed summary before anything is chosen (rarely seen — the
  // wheel defaults to the first item so it always has a concrete selection).
  placeholder?: string
}>(), { collapsible: true })

const model = defineModel<T | undefined>({ required: true })

const open = ref(false)
const summary = computed(() =>
  props.items.find(i => i.value === model.value)?.label ?? props.placeholder ?? ''
)

// A wheel always has a centred row, so keep the model on a real item: default to
// the first whenever it holds nothing in the list (fresh form, or list just
// loaded). This also feeds the form a value without an extra tap.
watchEffect(() => {
  if (props.items.length && !props.items.some(i => i.value === model.value)) {
    model.value = props.items[0]!.value
  }
})
// Guaranteed-concrete value handed to the wheel (which requires a defined model).
const current = computed<T>({
  get: () => (model.value ?? props.items[0]?.value) as T,
  set: (v) => { model.value = v }
})

// Re-anchor when revealed — the wheel can't scroll while collapsed (display:none).
const wheel = useTemplateRef<{ reanchor: () => void }>('wheel')
watch(open, (isOpen) => {
  if (!isOpen) return
  nextTick(() => wheel.value?.reanchor())
})
</script>

<template>
  <div :class="collapsible ? 'overflow-hidden rounded-xl border border-default' : ''">
    <button
      v-if="collapsible"
      type="button"
      class="flex w-full items-center justify-between gap-2 px-3 py-3 text-sm"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="min-w-0 truncate font-medium text-highlighted">{{ summary }}</span>
      <UIcon
        :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-5 shrink-0 text-muted"
      />
    </button>
    <div
      :class="[
        collapsible ? 'px-2 pb-2' : '',
        collapsible && !open ? 'hidden' : ''
      ]"
    >
      <CommonWheelPicker ref="wheel" v-model="current" :items="items" :aria-label="ariaLabel" />
    </div>
  </div>
</template>
