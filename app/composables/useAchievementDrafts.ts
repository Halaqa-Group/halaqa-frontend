import { STORE_DRAFTS, idbGetAll, idbPut, idbDelete } from '~/utils/idb'
import type { ApiAchievement, CreateAchievementDto } from '~/types'

// Local, exactly-once drafts for recitations recorded offline. Unlike the write
// outbox, an achievement create is NOT idempotent server-side, so we must not
// queue one per autosync tick — instead the whole session is kept as a single
// draft (keyed by session) and sent once on reconnect.

export interface AchievementDraft {
  id: string // session key: `${studentId}:${date}:${itemId}`
  dto: CreateAchievementDto
  approve: boolean
  updatedAt: number
}

const drafts = ref<AchievementDraft[]>([])
const flushedAt = ref(0)
const failedCount = ref(0)
let flushing = false
let refreshed = false

async function refresh() {
  if (!import.meta.client) return
  try {
    drafts.value = await idbGetAll<AchievementDraft>(STORE_DRAFTS)
  } catch {
    drafts.value = []
  }
}

export function useAchievementDrafts() {
  const draftCount = computed(() => drafts.value.length)

  if (import.meta.client && !refreshed) {
    refreshed = true
    void refresh()
  }

  // Overwrite-by-key: the session's whole recitation is one draft, so repeated
  // saves (autosync, explicit) never create duplicates.
  async function saveDraft(sessionKey: string, dto: CreateAchievementDto, approve: boolean) {
    // `approve` is sticky — once the teacher approved offline, a later plain
    // autosync tick must not downgrade the draft back to unapproved.
    const existing = drafts.value.find(d => d.id === sessionKey)
    const draft: AchievementDraft = {
      id: sessionKey,
      dto,
      approve: approve || !!existing?.approve,
      updatedAt: Date.now()
    }
    await idbPut(STORE_DRAFTS, draft)
    await refresh()
  }

  async function deleteDraft(sessionKey: string) {
    await idbDelete(STORE_DRAFTS, sessionKey)
    await refresh()
  }

  // Directly set the approve flag (unlike saveDraft, this is NOT sticky, so the
  // achievements table can toggle an offline draft approved/unapproved).
  async function setApproval(sessionKey: string, approve: boolean) {
    const existing = drafts.value.find(d => d.id === sessionKey)
    if (!existing) return
    await idbPut(STORE_DRAFTS, { ...existing, approve, updatedAt: Date.now() })
    await refresh()
  }

  // Send each draft exactly once, in order: create → (approve if flagged) →
  // remove. Runs online, so it uses the normal API client. Guarded so two
  // triggers (online watcher + startup) can't double-send.
  async function flush(): Promise<void> {
    if (flushing || !import.meta.client || !navigator.onLine) return
    flushing = true
    failedCount.value = 0
    const api = useApi()
    try {
      await refresh()
      let changed = 0
      for (const draft of [...drafts.value]) {
        try {
          const created = await api<ApiAchievement>('/achievements', { method: 'POST', body: draft.dto })
          // Delete BEFORE any further await so a concurrent flush can't re-create it.
          await deleteDraft(draft.id)
          changed++
          if (draft.approve && created?.id != null) {
            // Best-effort approve; if it fails the record still exists unapproved
            // and the teacher can approve it from the list.
            try {
              await api(`/achievements/${created.id}/approve`, { method: 'POST' })
            } catch {
              failedCount.value++
            }
          }
        } catch (e: unknown) {
          const status = (e as { response?: { status?: number } })?.response?.status
          if (status && status >= 400 && status < 500 && status !== 401) {
            // Permanent rejection — drop it so it can't wedge the queue, and flag.
            await deleteDraft(draft.id)
            failedCount.value++
            changed++
          } else {
            // Network / 401 / 5xx — keep and stop; retry on the next flush.
            break
          }
        }
      }
      if (changed > 0) flushedAt.value = Date.now()
    } finally {
      flushing = false
    }
  }

  return { drafts, draftCount, flushedAt, failedCount, saveDraft, deleteDraft, setApproval, flush, refresh }
}
