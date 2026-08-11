import { STORE_DRAFTS, idbGetAll, idbPut, idbDelete } from '~/utils/idb'
import { requestBackgroundSync } from '~/utils/backgroundSync'
import { unwrapList } from '~/utils/api/list'
import { forWire } from '~/utils/requestId'
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
    // A draft is the most common offline action, and it never touches the write
    // outbox — so register the Background-Sync tag here too, otherwise the SW is
    // never woken to notify about an unsynced recitation on reconnect.
    if (!navigator.onLine) await requestBackgroundSync()
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

  // A draft can describe a record the server ALREADY has: on a weak connection a
  // create is stored locally once its deadline expires, and such a request may
  // well have been applied with only its response lost. POST /achievements is not
  // idempotent, so ask the server before sending — one GET of that student's day —
  // and adopt the existing record instead of creating a second one.
  //
  // Matched on the same fields the draft key is built from (student + date + track
  // + range), which is precisely what "the same recording" means here. Throws if
  // the check itself can't complete: not knowing has to postpone the send, never
  // wave it through.
  async function findAlreadySynced(dto: CreateAchievementDto): Promise<ApiAchievement | null> {
    const api = useApi()
    const params = new URLSearchParams({ date: dto.date, limit: '100' })
    if (dto.halaqa_id) params.set('halaqa_id', String(dto.halaqa_id))
    // `fresh`: never let this read fall back to the offline copy of the list — a
    // stale copy that predates the lost create would answer "not there" and hand
    // us the duplicate we're trying to avoid.
    const raw = await api<unknown>(`/achievements?${params.toString()}`, { fresh: true } as Parameters<typeof api>[1])
    const rows = unwrapList<ApiAchievement>(raw)
    return rows.find(a =>
      a.student_id === dto.student_id
      && a.date === dto.date
      && a.track_type === dto.track_type
      && a.start_surah === dto.start_surah
      && a.start_verse === dto.start_verse
      && a.end_surah === dto.end_surah
      && a.end_verse === dto.end_verse
    ) ?? null
  }

  // Send each draft exactly once, in order: reconcile → create → (approve if
  // flagged) → remove. Runs online, so it uses the normal API client. Guarded so
  // two triggers (online watcher + startup) can't double-send.
  async function flush(): Promise<void> {
    if (flushing || !import.meta.client || !navigator.onLine) return
    flushing = true
    failedCount.value = 0
    const api = useApi()
    try {
      await refresh()
      let changed = 0
      for (const draft of [...drafts.value]) {
        // Kept out of the try below on purpose: a failed *read* must not be
        // mistaken for the create being rejected (which drops the draft). Not
        // knowing whether the server already has it postpones the send instead.
        let existing: ApiAchievement | null
        try {
          existing = await findAlreadySynced(draft.dto)
        } catch {
          break
        }
        try {
          // Bundle the approval into the create — one request instead of two, and
          // the same halaqa-scope check either way. Only an ADOPTED record (already
          // on the server, unapproved) still needs the separate call below.
          const created = existing
            ?? await api<ApiAchievement>('/achievements', {
              method: 'POST',
              body: forWire(draft.approve ? { ...draft.dto, approve: true } : draft.dto)
            })
          // Delete BEFORE any further await so a concurrent flush can't re-create it.
          await deleteDraft(draft.id)
          changed++
          if (draft.approve && created?.id != null && created.status !== 'approved') {
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
