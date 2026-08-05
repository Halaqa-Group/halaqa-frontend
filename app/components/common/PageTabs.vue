<script setup lang="ts">
import type { TabsItem, TabsProps } from '@nuxt/ui'

// Full-page tabs: the tab bar bleeds to the dashboard panel edges (cancelling the
// panel body's `p-4 sm:p-6`) and, on mobile, a horizontal swipe anywhere in the
// panel body moves to the next/previous tab. Card-nested tabs keep the plain UTabs.
const props = defineProps<{
  items: TabsItem[]
  ui?: TabsProps['ui']
  // Sit the tab bar flush under the page header by cancelling the body's `pt-3`
  // top padding. Use when the tabs are the first thing in the body.
  flushTop?: boolean
}>()

// Mirrors UTabs' v-model so the parent keeps owning the active value.
const model = defineModel<string | number | undefined>()

defineOptions({ inheritAttrs: false })

const rootEl = ref<HTMLElement>()

// Pull the tab bar out to the panel edges, then pad the triggers back so they
// line up with the page content. Widths compensate for the negative margins so
// the bar is exactly panel-wide (edge to edge) regardless of flex alignment, and
// it scrolls horizontally when the triggers overflow a narrow phone.
const listClass = [
  '-mx-4 w-[calc(100%+2rem)] px-4',
  'sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6',
  'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
].join(' ')

const mergedUi = computed(() => {
  const passed = props.ui ?? {}
  const list = [passed.list, listClass].filter(Boolean).join(' ')
  // Keep each tab at its natural width and let the bar scroll horizontally
  // instead of squeezing/truncating labels when they don't all fit.
  const trigger = [passed.trigger, 'shrink-0'].filter(Boolean).join(' ')
  const label = [passed.label, 'whitespace-nowrap'].filter(Boolean).join(' ')
  return { ...passed, list, trigger, label }
})

const wrapperClass = computed(() => (props.flushTop ? '-mt-3' : undefined))

const currentIndex = computed(() =>
  Math.max(0, props.items.findIndex(i => String(i.value) === String(model.value)))
)

function goTo(index: number) {
  const clamped = Math.min(Math.max(index, 0), props.items.length - 1)
  const value = props.items[clamped]?.value
  if (value !== undefined) model.value = value
}

// Swipe-to-switch. We listen on the scrollable panel body so a swipe anywhere on
// the page changes tabs — not just over the tab content. We measure on touchend
// rather than preventing default so vertical scrolling still works; a gesture
// only counts when it is clearly horizontal and clears the threshold.
let startX = 0
let startY = 0
let tracking = false

// True when the touch began inside something that scrolls horizontally itself
// (the tab bar, the status-chip row, a wide table). A horizontal drag there is
// meant to scroll that element, not flip the tab.
function beganInHorizontalScroller(target: HTMLElement | null): boolean {
  let node: HTMLElement | null = target
  while (node && node !== swipeTarget) {
    if (node.getAttribute('role') === 'tablist') return true
    const overflowX = getComputedStyle(node).overflowX
    if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth) {
      return true
    }
    node = node.parentElement
  }
  return false
}

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  // Gestures that begin on a horizontally scrollable element belong to it.
  if (beganInHorizontalScroller(e.target as HTMLElement | null)) {
    tracking = false
    return
  }
  startX = touch.clientX
  startY = touch.clientY
  tracking = true
}

function onTouchEnd(e: TouchEvent) {
  if (!tracking) return
  tracking = false
  const touch = e.changedTouches[0]
  if (!touch) return

  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  const THRESHOLD = 50
  if (Math.abs(dx) < THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return

  // Read-direction aware: in RTL the next tab sits to the left, so a rightward
  // swipe advances. Reading the computed direction keeps this in sync with layout.
  const rtl = rootEl.value ? getComputedStyle(rootEl.value).direction === 'rtl' : false
  const advance = rtl ? dx > 0 : dx < 0
  goTo(currentIndex.value + (advance ? 1 : -1))
}

// Walk up to the nearest scrolling ancestor (the dashboard panel body) so the
// swipe covers the whole page, falling back to our own element.
function findScrollParent(el: HTMLElement | undefined): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

let swipeTarget: HTMLElement | null = null

onMounted(() => {
  swipeTarget = findScrollParent(rootEl.value) ?? rootEl.value ?? null
  swipeTarget?.addEventListener('touchstart', onTouchStart, { passive: true })
  swipeTarget?.addEventListener('touchend', onTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  swipeTarget?.removeEventListener('touchstart', onTouchStart)
  swipeTarget?.removeEventListener('touchend', onTouchEnd)
  swipeTarget = null
})
</script>

<template>
  <div ref="rootEl" :class="wrapperClass">
    <UTabs
      v-model="model"
      :items="items"
      :ui="mergedUi"
      v-bind="$attrs"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </UTabs>
  </div>
</template>
