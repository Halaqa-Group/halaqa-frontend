import { verseKeyOrder } from '~/utils/mushaf'

// A verse-range spot the student is tested on during a partial (`test`)
// recitation. The teacher defines it by tapping its first and last word on the
// mushaf; errors are then marked within it. Distinct from a `MarkGroups` block
// (which groups words of a *single* error) — a spot is a tested passage that
// carries many errors.
export interface TestSpot {
  id: string
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
}

export interface LessonRange {
  startSurah: number
  startVerse: number
  endSurah: number
  endVerse: number
}

const STORAGE_PREFIX = 'recitation-spots:'

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`
}

function newSpotId(): string {
  const c = globalThis.crypto
  return c?.randomUUID ? c.randomUUID() : `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

// verseKey is "surah:ayah" (the value the mushaf reports alongside each word).
function parseVerseKey(verseKey: string): { surah: number, verse: number } | null {
  const [s, v] = verseKey.split(':').map(Number)
  if (!s || !v) return null
  return { surah: s, verse: v }
}

/**
 * Manages the ordered list of tested spots for one recitation session, plus the
 * two-tap boundary selection that builds each spot. Persists spots per session
 * (the pending first tap is transient). Taps outside the lesson range are ignored.
 */
export function useTestSpots(
  sessionId: MaybeRefOrGetter<string>,
  range: MaybeRefOrGetter<LessonRange | null>
) {
  const spots = ref<TestSpot[]>([])
  // First boundary tapped; the next in-range tap closes the spot.
  const pendingStart = ref<{ surah: number, verse: number } | null>(null)

  function load(id: string) {
    if (!id) {
      spots.value = []
      return
    }
    try {
      const raw = localStorage.getItem(storageKey(id))
      spots.value = raw ? (JSON.parse(raw) as TestSpot[]) : []
    } catch {
      spots.value = []
    }
  }

  function persist(id: string, list: TestSpot[]) {
    if (!id) return
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(list))
    } catch {
      // best-effort persistence; ignore quota/serialization failures
    }
  }

  watch(() => toValue(sessionId), (id) => {
    pendingStart.value = null
    load(id)
  }, { immediate: true })

  watch(spots, list => persist(toValue(sessionId), list), { deep: true })

  function inLessonRange(surah: number, verse: number): boolean {
    const r = toValue(range)
    if (!r) return false
    const n = surah * 1000 + verse
    return n >= r.startSurah * 1000 + r.startVerse && n <= r.endSurah * 1000 + r.endVerse
  }

  /**
   * Handle a boundary tap. First in-range tap arms the start; the second closes
   * the spot (endpoints ordered by mushaf position). Returns the new spot, or
   * null while still waiting for the second tap / when the tap is out of range.
   */
  function pickBoundary(verseKey: string): TestSpot | null {
    const parsed = parseVerseKey(verseKey)
    if (!parsed || !inLessonRange(parsed.surah, parsed.verse)) return null

    if (!pendingStart.value) {
      pendingStart.value = parsed
      return null
    }

    const a = pendingStart.value
    const b = parsed
    // Order endpoints so start precedes end in mushaf order.
    const [lo, hi] = verseKeyOrder(`${a.surah}:${a.verse}`) <= verseKeyOrder(`${b.surah}:${b.verse}`)
      ? [a, b]
      : [b, a]
    const spot: TestSpot = {
      id: newSpotId(),
      startSurah: lo.surah,
      startVerse: lo.verse,
      endSurah: hi.surah,
      endVerse: hi.verse
    }
    spots.value = [...spots.value, spot]
    pendingStart.value = null
    return spot
  }

  function cancelPending() {
    pendingStart.value = null
  }

  function removeSpot(id: string) {
    spots.value = spots.value.filter(s => s.id !== id)
  }

  function clearSpots() {
    spots.value = []
    pendingStart.value = null
  }

  const isSelecting = computed(() => pendingStart.value !== null)

  return {
    spots: readonly(spots),
    pendingStart: readonly(pendingStart),
    isSelecting,
    pickBoundary,
    cancelPending,
    removeSpot,
    clearSpots
  }
}
