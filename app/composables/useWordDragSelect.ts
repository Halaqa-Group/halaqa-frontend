import type { WordKey } from '~/types/recitation'

const WORD_SELECTOR = '.mushaf-word--tappable'
const SELECTING_CLASS = 'mushaf-word--selecting'

function keyOf(el: Element): WordKey | null {
  const k = el.getAttribute('data-word-key')
  const p = el.getAttribute('data-word-position')
  if (k == null || p == null) return null
  return `${k}:${p}`
}

export interface DragSelectRequest {
  keys: WordKey[]
  /** Viewport coords of the release point, for anchoring the severity picker. */
  x: number
  y: number
}

/**
 * Press-and-drag word selection over the mushaf page. Dragging horizontally
 * across a run of words highlights the contiguous range (in reading order)
 * between the start word and the word under the pointer; on release the range
 * is handed to `onRequest` so the caller can apply one severity to all of them.
 * A press that never leaves its start word falls through to the native word
 * `@click` (single-tap severity cycle); a vertical drag is left to scroll.
 */
export function useWordDragSelect(options: {
  container: Ref<HTMLElement | null>
  enabled: () => boolean
  onRequest: (req: DragSelectRequest) => void
}) {
  const { container, enabled, onRequest } = options

  const startedOnWord = ref(false)

  const DECIDE_PX = 8

  let words: HTMLElement[] = []
  let startIndex = -1
  let startX = 0
  let startY = 0
  let engaged = false
  let lastRange: HTMLElement[] = []
  let multi = false
  let activePointer: number | null = null

  function indexFromPoint(x: number, y: number): number {
    const el = document.elementFromPoint(x, y)
    const word = el?.closest(WORD_SELECTOR) as HTMLElement | null
    return word ? words.indexOf(word) : -1
  }

  function paint(range: HTMLElement[]) {
    for (const el of lastRange) el.classList.remove(SELECTING_CLASS)
    for (const el of range) el.classList.add(SELECTING_CLASS)
    lastRange = range
  }

  function clearPaint() {
    for (const el of lastRange) el.classList.remove(SELECTING_CLASS)
    lastRange = []
  }

  function detachMoveListeners() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    activePointer = null
    startIndex = -1
    engaged = false
    multi = false
  }

  function onPointerDown(e: PointerEvent) {
    const secondaryMouse = e.pointerType === 'mouse' && e.button !== 0
    if (secondaryMouse || !enabled()) {
      startedOnWord.value = false
      return
    }
    const target = (e.target as Element | null)?.closest(WORD_SELECTOR) as HTMLElement | null
    startedOnWord.value = !!target
    if (!target) return

    const root = container.value
    words = root ? Array.from(root.querySelectorAll<HTMLElement>(WORD_SELECTOR)) : []
    startIndex = words.indexOf(target)
    if (startIndex < 0) return
    startX = e.clientX
    startY = e.clientY
    engaged = false
    multi = false
    activePointer = e.pointerId
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  function onPointerMove(e: PointerEvent) {
    if (activePointer !== e.pointerId || startIndex < 0) return

    // First meaningful move decides intent: horizontal → select, vertical →
    // let the page scroll (bow out without preventing default).
    if (!engaged) {
      const dx = Math.abs(e.clientX - startX)
      const dy = Math.abs(e.clientY - startY)
      if (dx < DECIDE_PX && dy < DECIDE_PX) return
      if (dy > dx) {
        startedOnWord.value = false
        detachMoveListeners()
        return
      }
      engaged = true
    }

    // Suppress page scroll / swipe-to-navigate while range-selecting.
    e.preventDefault()
    const idx = indexFromPoint(e.clientX, e.clientY)
    if (idx < 0) return
    if (idx !== startIndex) multi = true
    const lo = Math.min(startIndex, idx)
    const hi = Math.max(startIndex, idx)
    paint(words.slice(lo, hi + 1))
  }

  function onPointerUp(e: PointerEvent) {
    if (activePointer !== e.pointerId) return
    const keys = lastRange.map(keyOf).filter((k): k is WordKey => k != null)
    const isMulti = multi && keys.length >= 2
    clearPaint()
    detachMoveListeners()
    if (isMulti) {
      // Swallow the click that would otherwise cycle the word under the pointer.
      suppressNextClick()
      onRequest({ keys, x: e.clientX, y: e.clientY })
    }
    // Single-word press: leave it to the native @click severity cycle.
  }

  function onPointerCancel(e: PointerEvent) {
    if (activePointer !== e.pointerId) return
    clearPaint()
    detachMoveListeners()
  }

  function suppressNextClick() {
    const handler = (ev: MouseEvent) => {
      ev.stopPropagation()
      ev.preventDefault()
      window.removeEventListener('click', handler, true)
    }
    window.addEventListener('click', handler, true)
    // Drop the guard if no click follows (e.g. release over empty space).
    setTimeout(() => window.removeEventListener('click', handler, true), 400)
  }

  let bound: HTMLElement | null = null
  function bind(el: HTMLElement | null) {
    if (bound === el) return
    if (bound) bound.removeEventListener('pointerdown', onPointerDown)
    bound = el
    if (bound) bound.addEventListener('pointerdown', onPointerDown)
  }
  watch(container, bind, { immediate: true })

  onBeforeUnmount(() => {
    bind(null)
    detachMoveListeners()
    clearPaint()
  })

  return { startedOnWord }
}
