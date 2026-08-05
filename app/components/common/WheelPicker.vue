<script setup lang="ts" generic="T extends string | number">
// An iOS-style inline wheel (carousel) picker: a scrolling column whose centred
// row is the selection. Built on native scroll (so touch, trackpad and wheel all
// work) plus manual snap on settle, and virtualised so a 100+ item column (all
// 114 surahs, 286 ayahs of Al-Baqarah) only ever renders the handful of rows in
// view. Values are committed once the scroll comes to rest, not on every frame,
// so range validators / snap-to watchers upstream don't fire mid-spin.
export interface WheelItem<V> {
  value: V
  label: string
  // A small caption shown on the row (e.g. the mushaf page a verse opens).
  badge?: string
}

const props = withDefaults(defineProps<{
  items: WheelItem<T>[]
  // Row height in px; the column is `itemHeight * visibleCount` tall.
  itemHeight?: number
  // How many rows are visible at once (odd, so one sits dead centre).
  visibleCount?: number
  ariaLabel?: string
}>(), { itemHeight: 44, visibleCount: 5 })

const model = defineModel<T>({ required: true })

const scroller = ref<HTMLElement | null>(null)
// The scroll position expressed as a fractional row index; drives the wheel's
// per-row fade/tilt so it tracks the finger continuously.
const offset = ref(0)

const height = computed(() => props.itemHeight * props.visibleCount)
const padTop = computed(() => (height.value - props.itemHeight) / 2)
const contentHeight = computed(() => (props.items.length - 1) * props.itemHeight + height.value)
const half = computed(() => Math.floor(props.visibleCount / 2))

const activeIndex = computed(() =>
  Math.max(0, Math.min(props.items.length - 1, Math.round(offset.value)))
)

// Only the rows within (and just past) the viewport are rendered.
const windowRows = computed(() => {
  const lo = Math.max(0, Math.floor(offset.value) - half.value - 1)
  const hi = Math.min(props.items.length - 1, Math.ceil(offset.value) + half.value + 1)
  const out: { item: WheelItem<T>, index: number }[] = []
  for (let i = lo; i <= hi; i++) {
    const item = props.items[i]
    if (item) out.push({ item, index: i })
  }
  return out
})

function styleFor(i: number): Record<string, string> {
  // Flat rows (no tilt/scale) that just fade out from the centre, tracking the
  // fractional scroll so the fade is smooth mid-spin.
  const ad = Math.abs(i - offset.value)
  return {
    top: `${padTop.value + i * props.itemHeight}px`,
    height: `${props.itemHeight}px`,
    lineHeight: `${props.itemHeight}px`,
    opacity: String(Math.max(0.14, 1 - ad * 0.4))
  }
}

let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const el = scroller.value
    if (el) offset.value = el.scrollTop / props.itemHeight
    scheduleSettle()
  })
}

let settleTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSettle() {
  if (settleTimer) clearTimeout(settleTimer)
  settleTimer = setTimeout(settle, 110)
}
// Once the finger lifts and momentum dies: snap to the nearest row, then commit
// its value upward.
function settle() {
  const el = scroller.value
  if (!el) return
  const idx = activeIndex.value
  const target = idx * props.itemHeight
  if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target, behavior: 'smooth' })
  const v = props.items[idx]?.value
  if (v !== undefined && v !== model.value) model.value = v
}

function scrollToValue(behavior: ScrollBehavior) {
  const idx = props.items.findIndex(i => i.value === model.value)
  if (idx < 0) return
  offset.value = idx
  nextTick(() => scroller.value?.scrollTo({ top: idx * props.itemHeight, behavior }))
}

function selectIndex(i: number) {
  const item = props.items[i]
  if (!item) return
  model.value = item.value
  scrollToValue('smooth')
}

const KEY_STEP: Record<string, (i: number, last: number) => number> = {
  ArrowDown: i => i + 1,
  ArrowUp: i => i - 1,
  Home: () => 0,
  End: (_i, last) => last
}
function onKey(e: KeyboardEvent) {
  const step = KEY_STEP[e.key]
  if (!step) return
  e.preventDefault()
  const last = props.items.length - 1
  selectIndex(Math.max(0, Math.min(last, step(activeIndex.value, last))))
}

onMounted(() => scrollToValue('auto'))

// A wheel mounted while hidden (a collapsed mobile picker, a closed drawer) has no
// height, so its onMounted scroll is a no-op — it would open scrolled to the top
// with the selected row rendered far below the viewport, looking empty until you
// nudge it. The parent that reveals it calls this the moment it's visible; setting
// scrollTop directly on the now-laid-out element sticks with no timing guesswork.
function reanchor() {
  const el = scroller.value
  if (!el) return
  const idx = props.items.findIndex(i => i.value === model.value)
  if (idx < 0) return
  offset.value = idx
  el.scrollTop = idx * props.itemHeight
}
defineExpose({ reanchor })

// Follow outside changes (a paste, a surah change resetting the verse) without
// fighting our own commits — the guard skips when we're already parked there.
watch(model, () => {
  const idx = props.items.findIndex(i => i.value === model.value)
  if (idx >= 0 && idx !== activeIndex.value) scrollToValue('auto')
})
// The verse column's length changes when the surah does; re-park afterwards.
watch(() => props.items.length, () => nextTick(() => scrollToValue('auto')))

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  if (settleTimer) clearTimeout(settleTimer)
})
</script>

<template>
  <div
    class="wheel relative overflow-hidden"
    :style="{ height: `${height}px` }"
    role="listbox"
    :aria-label="ariaLabel"
  >
    <!-- The rounded capsule the centred row parks under. -->
    <div
      class="pointer-events-none absolute inset-x-1 rounded-full bg-elevated"
      :style="{ top: `${padTop}px`, height: `${itemHeight}px` }"
    />
    <div
      ref="scroller"
      class="wheel-scroller h-full"
      tabindex="0"
      @scroll.passive="onScroll"
      @keydown="onKey"
    >
      <div class="relative w-full" :style="{ height: `${contentHeight}px` }">
        <button
          v-for="row in windowRows"
          :key="String(row.item.value)"
          type="button"
          role="option"
          :aria-selected="row.index === activeIndex"
          class="wheel-item absolute inset-x-0 flex items-center justify-center gap-1.5 px-3 text-[15px] text-highlighted outline-none"
          :class="row.index === activeIndex ? 'font-semibold' : ''"
          :style="styleFor(row.index)"
          @click="selectIndex(row.index)"
        >
          <span class="min-w-0 truncate">{{ row.item.label }}</span>
          <span
            v-if="row.item.badge"
            class="shrink-0 rounded bg-primary/10 px-1 text-[9px] font-medium leading-tight text-primary tabular-nums"
          >{{ row.item.badge }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wheel-scroller {
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.wheel-scroller::-webkit-scrollbar {
  display: none;
}
.wheel-item {
  will-change: opacity;
}
</style>
