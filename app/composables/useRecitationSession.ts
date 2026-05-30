import type { MarkCounts, MarkType, RecitationMarks, WordKey } from '~/types/recitation'

const STORAGE_PREFIX = 'recitation:'

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`
}

/**
 * Holds the local state for one "marking session" — a teacher sitting with
 * one student to review one assigned range.
 *
 * The session is keyed by an opaque sessionId (in Phase 4 this will be
 * `${studentId}:${date}:${planItemId}`; for the dev sandbox it's a hash
 * of the range). State auto-persists to localStorage on every change so a
 * page refresh during the session doesn't lose work.
 */
export function useRecitationSession(sessionId: MaybeRefOrGetter<string>) {
  const mode = ref<MarkType>('mistake')
  const marks = ref<RecitationMarks>({})

  function load(id: string) {
    if (!id) {
      marks.value = {}
      return
    }
    try {
      const raw = localStorage.getItem(storageKey(id))
      marks.value = raw ? (JSON.parse(raw) as RecitationMarks) : {}
    } catch {
      marks.value = {}
    }
  }

  function persist(id: string, m: RecitationMarks) {
    if (!id) return
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(m))
    } catch {
      // localStorage can throw in private mode or when over quota — silently
      // accept the loss of autosave rather than blocking the teacher's work.
    }
  }

  watch(() => toValue(sessionId), id => load(id), { immediate: true })

  watch(
    marks,
    (m) => { persist(toValue(sessionId), m) },
    { deep: true }
  )

  /**
   * Apply or toggle the current mode on a word.
   *   - if the word already carries the same mode → clear it
   *   - if it carries a different mode → replace
   *   - if it has no mark → set to current mode
   */
  function tap(wordKey: WordKey) {
    const current = marks.value[wordKey]
    if (current === mode.value) {
      const next = { ...marks.value }
      delete next[wordKey]
      marks.value = next
    } else {
      marks.value = { ...marks.value, [wordKey]: mode.value }
    }
  }

  function clearAll() {
    marks.value = {}
  }

  const counts = computed<MarkCounts>(() => {
    let mistake = 0
    let warning = 0
    let tajweed = 0
    for (const v of Object.values(marks.value)) {
      if (v === 'mistake') mistake++
      else if (v === 'warning') warning++
      else if (v === 'tajweed') tajweed++
    }
    return { mistake, warning, tajweed, total: mistake + warning + tajweed }
  })

  return {
    mode,
    marks: readonly(marks),
    counts,
    tap,
    clearAll
  }
}
