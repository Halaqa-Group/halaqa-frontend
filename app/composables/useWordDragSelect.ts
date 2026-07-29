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

export function useWordDragSelect(options: {
  container: Ref<HTMLElement | null>
  enabled: () => boolean
  onRequest: (req: DragSelectRequest) => void
}) {
  const { container, enabled, onRequest } = options

  const startedOnWord = ref(false)

  const DECIDE_PX = 8

  // Touch only: a drag across words has to compete with the page swipe, and the
  // page is almost nothing but words — so on a finger, selection is claimed by a
  // press rather than by the drag itself. Move before the press lands and the
  // gesture is left alone for the swipe to turn the page. A mouse has no such
  // rival, so it keeps selecting from the first pixel of the drag.
  const HOLD_MS = 280
  const HOLD_SLOP_PX = 10

  let words: HTMLElement[] = []
  let startIndex = -1
  let startX = 0
  let startY = 0
  let held = false
  let pressClaimed = false
  let engaged = false
  let lastRange: HTMLElement[] = []
  let multi = false
  let activePointer: number | null = null
  let holdTimer: ReturnType<typeof setTimeout> | null = null

  function clearHoldTimer() {
    if (!holdTimer) return
    clearTimeout(holdTimer)
    holdTimer = null
  }

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
    clearHoldTimer()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    activePointer = null
    startIndex = -1
    held = false
    pressClaimed = false
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
    const mouse = e.pointerType === 'mouse'
    // Until a finger has held still long enough, the gesture is not ours: leaving
    // this false is what lets the swipe turn the page from anywhere on the text.
    startedOnWord.value = mouse && !!target
    if (!target) return

    const root = container.value
    words = root ? Array.from(root.querySelectorAll<HTMLElement>(WORD_SELECTOR)) : []
    startIndex = words.indexOf(target)
    if (startIndex < 0) return
    startX = e.clientX
    startY = e.clientY
    held = mouse
    engaged = false
    multi = false
    activePointer = e.pointerId
    if (!mouse) holdTimer = setTimeout(claimForSelection, HOLD_MS)
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  /**
   * The press landed: the finger is selecting, not turning the page. Paint the word
   * it started on so the gesture visibly takes hold, and skip the direction test —
   * after a deliberate press, any drag is a selection, upward included.
   */
  function claimForSelection() {
    holdTimer = null
    const start = words[startIndex]
    if (!start) return
    held = true
    pressClaimed = true
    engaged = true
    startedOnWord.value = true
    paint([start])
    navigator.vibrate?.(8)
  }

  function onPointerMove(e: PointerEvent) {
    if (activePointer !== e.pointerId || startIndex < 0) return

    // Moved before the press landed — the finger is on its way somewhere, so drop
    // the gesture entirely and let useSwipe read it as a page turn.
    if (!held) {
      if (Math.abs(e.clientX - startX) > HOLD_SLOP_PX || Math.abs(e.clientY - startY) > HOLD_SLOP_PX) {
        detachMoveListeners()
      }
      return
    }

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
    const claimed = pressClaimed
    clearPaint()
    detachMoveListeners()
    if (isMulti) {
      // Swallow the click that would otherwise cycle the word under the pointer.
      suppressNextClick()
      onRequest({ keys, x: e.clientX, y: e.clientY })
      return
    }
    // A press that was held and then abandoned marks nothing: the teacher committed
    // to selecting a run and changed their mind, which must not land a severity on
    // whatever word they happened to be resting on.
    if (claimed) suppressNextClick()
    // Otherwise a plain tap — leave it to the native @click severity cycle.
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
