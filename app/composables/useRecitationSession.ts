import type { MarkCounts, MarkGroups, RecitationMarks, Severity, WordKey } from '~/types/recitation'
import { SEVERITY_ORDER } from '~/types/recitation'

const STORAGE_PREFIX = 'recitation:'

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}${sessionId}`
}

// Persisted shape. Kept as an object so the block grouping travels with the
// marks; older sessions stored a bare `RecitationMarks`, still read below.
interface PersistedSession {
  marks: RecitationMarks
  groups: MarkGroups
}

function newGroupId(): string {
  const c = globalThis.crypto
  return c?.randomUUID ? c.randomUUID() : `g-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function useRecitationSession(sessionId: MaybeRefOrGetter<string>) {
  const marks = ref<RecitationMarks>({})
  // Word → block id for words marked together as one drag-selected run.
  const groups = ref<MarkGroups>({})

  function load(id: string) {
    if (!id) {
      marks.value = {}
      groups.value = {}
      return
    }
    try {
      const raw = localStorage.getItem(storageKey(id))
      if (!raw) {
        marks.value = {}
        groups.value = {}
        return
      }
      const parsed = JSON.parse(raw) as PersistedSession | RecitationMarks
      // New shape carries `marks`/`groups`; the legacy shape was a bare marks map
      // (word keys are "surah:ayah:position", so a top-level `marks` key is unambiguous).
      if (parsed && typeof parsed === 'object' && 'marks' in parsed) {
        const session = parsed as PersistedSession
        marks.value = session.marks ?? {}
        groups.value = session.groups ?? {}
      } else {
        marks.value = (parsed as RecitationMarks) ?? {}
        groups.value = {}
      }
    } catch {
      marks.value = {}
      groups.value = {}
    }
  }

  function persist(id: string, m: RecitationMarks, g: MarkGroups) {
    if (!id) return
    try {
      localStorage.setItem(storageKey(id), JSON.stringify({ marks: m, groups: g } satisfies PersistedSession))
    } catch {
      // best-effort persistence; ignore quota/serialization failures
    }
  }

  watch(() => toValue(sessionId), id => load(id), { immediate: true })

  watch(
    [marks, groups],
    ([m, g]) => { persist(toValue(sessionId), m, g) },
    { deep: true }
  )

  // Each tap steps the mark one notch down the severity spectrum
  //   (unmarked) → severe → medium → light → minor → (unmarked)
  // matching Tarteel's red→orange→yellow→green highlighting. Tapping any word of a
  // block cycles the WHOLE block as one unit (it stays grouped); a standalone word
  // cycles on its own.
  function tap(wordKey: WordKey) {
    const groupId = groups.value[wordKey]
    // A block shares one severity across all its words — read it off the tapped one.
    const current = marks.value[wordKey]
    const nextIndex = current ? SEVERITY_ORDER.indexOf(current) + 1 : 0
    const next = SEVERITY_ORDER[nextIndex] as Severity | undefined

    if (groupId) {
      const members = Object.keys(groups.value).filter(k => groups.value[k] === groupId)
      if (next) {
        const nextMarks = { ...marks.value }
        for (const k of members) nextMarks[k] = next
        marks.value = nextMarks
      } else {
        // stepped past the last level → clear the whole block
        const drop = new Set(members)
        marks.value = Object.fromEntries(
          Object.entries(marks.value).filter(([k]) => !drop.has(k))
        ) as RecitationMarks
        groups.value = Object.fromEntries(
          Object.entries(groups.value).filter(([k]) => !drop.has(k))
        ) as MarkGroups
      }
      return
    }

    if (next) {
      marks.value = { ...marks.value, [wordKey]: next }
    } else {
      // stepped past the last level → unmark (rebuild without this key)
      marks.value = Object.fromEntries(
        Object.entries(marks.value).filter(([k]) => k !== wordKey)
      ) as RecitationMarks
    }
  }

  // A drag-selected run of words. When more than one word is selected they form a
  // single block (shared id) that counts as one mistake; a one-word selection is
  // an ordinary standalone mark.
  function setMarks(keys: WordKey[], severity: Severity | null) {
    if (!keys.length) return
    if (severity) {
      const nextMarks: RecitationMarks = { ...marks.value }
      const nextGroups: MarkGroups = { ...groups.value }
      const groupId = keys.length > 1 ? newGroupId() : null
      for (const k of keys) {
        nextMarks[k] = severity
        if (groupId) nextGroups[k] = groupId
        else delete nextGroups[k]
      }
      marks.value = nextMarks
      groups.value = nextGroups
    } else {
      const drop = new Set(keys)
      marks.value = Object.fromEntries(
        Object.entries(marks.value).filter(([k]) => !drop.has(k))
      ) as RecitationMarks
      groups.value = Object.fromEntries(
        Object.entries(groups.value).filter(([k]) => !drop.has(k))
      ) as MarkGroups
    }
  }

  function clearAll() {
    marks.value = {}
    groups.value = {}
  }

  // A block counts once (all its words share one severity); standalone words each
  // count on their own.
  const counts = computed<MarkCounts>(() => {
    const c: MarkCounts = { severe: 0, medium: 0, light: 0, minor: 0, total: 0 }
    const countedGroups = new Set<string>()
    for (const [key, sev] of Object.entries(marks.value)) {
      const g = groups.value[key]
      if (g) {
        if (countedGroups.has(g)) continue
        countedGroups.add(g)
      }
      c[sev]++
      c.total++
    }
    return c
  })

  return {
    marks: readonly(marks),
    groups: readonly(groups),
    counts,
    tap,
    setMarks,
    clearAll
  }
}
