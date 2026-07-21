import type { MarkCounts, MarkGroups, RecitationMarks, Severity, WordKey } from '~/types/recitation'
import { SEVERITY_ORDER } from '~/types/recitation'

// Marks are NOT persisted client-side. They used to be cached in localStorage
// per session, which meant a half-finished marking session outlived the visit
// and was shown in place of what the server actually stored — the achievement
// said 5 mistakes + 2 tajweed while the mushaf showed a stale 4/3/1, and the
// restore was skipped entirely because local marks "already existed".
// The backend is the source of truth; this state lives for one visit only.
const LEGACY_STORAGE_PREFIXES = ['recitation:', 'recitation-spots:']

/** One-time sweep of the caches earlier builds left behind. */
export function purgeLegacyRecitationCache() {
  if (typeof localStorage === 'undefined') return
  try {
    const stale = Object.keys(localStorage).filter(k =>
      LEGACY_STORAGE_PREFIXES.some(p => k.startsWith(p))
    )
    for (const k of stale) localStorage.removeItem(k)
  } catch {
    // best-effort cleanup; a blocked localStorage is not an error here
  }
}

function newGroupId(): string {
  const c = globalThis.crypto
  return c?.randomUUID ? c.randomUUID() : `g-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function useRecitationSession(sessionId: MaybeRefOrGetter<string>) {
  const marks = ref<RecitationMarks>({})
  // Word → block id for words marked together as one drag-selected run.
  const groups = ref<MarkGroups>({})

  // Switching session starts clean — nothing is read back from storage.
  watch(() => toValue(sessionId), () => {
    marks.value = {}
    groups.value = {}
  })

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
      const groupId = keys.length > 1 ? newGroupId() : null
      // A one-word selection is standalone, so it must shed any block membership
      // it had; rebuild without those keys rather than deleting in place.
      const shed = new Set(keys)
      const nextGroups: MarkGroups = groupId
        ? { ...groups.value }
        : Object.fromEntries(
          Object.entries(groups.value).filter(([k]) => !shed.has(k))
        ) as MarkGroups
      for (const k of keys) {
        nextMarks[k] = severity
        if (groupId) nextGroups[k] = groupId
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
