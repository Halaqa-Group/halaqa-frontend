import type { MarkCounts, RecitationMarks, Severity, WordKey } from '~/types/recitation'
import { SEVERITY_ORDER } from '~/types/recitation'

const STORAGE_PREFIX = 'recitation:'

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`
}

export function useRecitationSession(sessionId: MaybeRefOrGetter<string>) {
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
      // best-effort persistence; ignore quota/serialization failures
    }
  }

  watch(() => toValue(sessionId), id => load(id), { immediate: true })

  watch(
    marks,
    (m) => { persist(toValue(sessionId), m) },
    { deep: true }
  )

  // Each tap steps the word one notch down the severity spectrum
  //   (unmarked) → severe → medium → light → minor → (unmarked)
  // matching Tarteel's red→orange→yellow→green highlighting.
  function tap(wordKey: WordKey) {
    const current = marks.value[wordKey]
    const nextIndex = current ? SEVERITY_ORDER.indexOf(current) + 1 : 0
    const next = SEVERITY_ORDER[nextIndex] as Severity | undefined
    if (next) {
      marks.value = { ...marks.value, [wordKey]: next }
    } else {
      // stepped past the last level → unmark (rebuild without this key)
      marks.value = Object.fromEntries(
        Object.entries(marks.value).filter(([k]) => k !== wordKey)
      ) as RecitationMarks
    }
  }

  function setMarks(keys: WordKey[], severity: Severity | null) {
    if (!keys.length) return
    if (severity) {
      const next: RecitationMarks = { ...marks.value }
      for (const k of keys) next[k] = severity
      marks.value = next
    } else {
      const drop = new Set(keys)
      marks.value = Object.fromEntries(
        Object.entries(marks.value).filter(([k]) => !drop.has(k))
      ) as RecitationMarks
    }
  }

  function clearAll() {
    marks.value = {}
  }

  const counts = computed<MarkCounts>(() => {
    const c: MarkCounts = { severe: 0, medium: 0, light: 0, minor: 0, total: 0 }
    for (const v of Object.values(marks.value)) {
      c[v]++
      c.total++
    }
    return c
  })

  return {
    marks: readonly(marks),
    counts,
    tap,
    setMarks,
    clearAll
  }
}
