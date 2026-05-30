import type { MarkCounts, MarkType, RecitationMarks, WordKey } from '~/types/recitation'

const STORAGE_PREFIX = 'recitation:'

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`
}

/**
 * Holds the local state for one "marking session" — a teacher sitting with
 * one student to review one assigned range.
 *
 * The session is keyed by an opaque sessionId (in Phase 4 this becomes
 * `${studentId}:${date}:${planItemId}`; for the dev sandbox it's a hash
 * of the range). State auto-persists to localStorage on every change so a
 * page refresh during the session doesn't lose work.
 *
 * Storage strategy:
 *   - `marks` is a shallowRef holding a plain {wordKey: MarkType} object.
 *   - tap() mutates the object IN PLACE and calls triggerRef() instead of
 *     cloning. Cloning was visibly slow on huge ranges (e.g. full Baqarah,
 *     ~6,000 words) where each tap allocated a fresh object including all
 *     unrelated entries. The shallow ref means Vue won't deep-walk the
 *     object on every dependency check, and triggerRef forces dependents
 *     to re-evaluate without us paying for an immutable update.
 *   - Consumers keep the same `marks[wordKey]` read API — the data shape
 *     didn't change, only how mutations are scheduled.
 */
export function useRecitationSession(sessionId: MaybeRefOrGetter<string>) {
  const mode = ref<MarkType>('mistake')
  const marks = shallowRef<RecitationMarks>({})

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

  // shallowRef only fires on reference swap OR explicit triggerRef. Both
  // load() (reassigns marks) and tap() (calls triggerRef below) flow
  // through this same watcher. No { deep: true } needed any more.
  watch(marks, (m) => { persist(toValue(sessionId), m) })

  /**
   * Apply or toggle the current mode on a word.
   *   - same mode → clear it
   *   - different mode → replace
   *   - no mark → set to current mode
   * Mutates in place; relies on triggerRef() to notify dependents.
   */
  function tap(wordKey: WordKey) {
    const current = marks.value[wordKey]
    if (current === mode.value) {
      delete marks.value[wordKey]
    } else {
      marks.value[wordKey] = mode.value
    }
    triggerRef(marks)
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
    marks,
    counts,
    tap,
    clearAll
  }
}
