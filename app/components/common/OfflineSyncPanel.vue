<script setup lang="ts">
// Full log of everything waiting to sync: offline recitation drafts, queued
// attendance syncs, queued deletes, and anything that permanently failed — with
// per-item discard/retry and a "sync now" action. Opened from the status badge.
import { createReusableTemplate, useMediaQuery, useOnline } from '@vueuse/core'
import type { OutboxEntry } from '~/composables/useOfflineOutbox'
import type { AchievementDraft } from '~/composables/useAchievementDrafts'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const online = useOnline()
const { pending, failed, flush, retry, discard } = useOfflineOutbox()
const { drafts, deleteDraft, flush: flushDrafts } = useAchievementDrafts()

const hasItems = computed(() => pending.value.length + failed.value.length + drafts.value.length > 0)
const syncing = ref(false)

// Side slide-over on desktop, bottom drawer on mobile — body + footer are shared
// between the two shells via reusable templates.
const isDesktop = useMediaQuery('(min-width: 640px)')
const [DefineBody, ReuseBody] = createReusableTemplate()
const [DefineFooter, ReuseFooter] = createReusableTemplate()

// Opt-in to a local notification when the SW reconnects while the app is closed
// (see app/service-worker/outbox-sync.ts). Only offered where Background Sync
// can actually wake the SW while closed — Chromium/Android. On iOS/Safari and
// Firefox there is no reconnect wake-up, so we don't promise what we can't keep.
const notifPermission = ref<NotificationPermission>('default')
const notifSupported = computed(() =>
  import.meta.client
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'SyncManager' in window
)

onMounted(() => {
  if (notifSupported.value) notifPermission.value = Notification.permission
})

async function enableNotifications() {
  if (!notifSupported.value) return
  try {
    notifPermission.value = await Notification.requestPermission()
  } catch {
    // Older Safari uses the callback form and rejects the promise — the support
    // gate already hides the button there, so just swallow it.
  }
}

function outboxLabel(e: OutboxEntry): string {
  if (e.kind.startsWith('attendance')) {
    const records = (e.body as { records?: unknown[] })?.records ?? []
    const date = (records[0] as { date?: string })?.date ?? ''
    return t('pwa.logAttendance', { count: records.length, date })
  }
  if (e.kind === 'achievement-delete') {
    const id = /\/achievements\/(\d+)/.exec(e.url)?.[1] ?? ''
    return t('pwa.logDelete', { id })
  }
  return e.label ?? e.url
}

function draftLabel(d: AchievementDraft): string {
  const dto = d.dto
  const range = `${dto.start_surah}:${dto.start_verse}–${dto.end_surah}:${dto.end_verse}`
  return t('pwa.logRecitation', { date: dto.date, range })
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { numberingSystem: 'latn' })
}

async function syncNow() {
  if (syncing.value) return
  syncing.value = true
  try {
    await flush()
    await flushDrafts()
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <DefineBody>
      <!-- Reconnect-notification opt-in (Chromium/Android only) -->
      <div v-if="notifSupported" class="mb-4">
        <div
          v-if="notifPermission === 'default'"
          class="flex items-center gap-3 p-3 rounded-xl bg-elevated"
        >
          <UIcon name="i-lucide-bell" class="size-4 text-primary shrink-0" />
          <p class="min-w-0 flex-1 text-xs text-on-surface-variant">
            {{ t('pwa.notifyPrompt') }}
          </p>
          <UButton
            size="xs"
            color="primary"
            variant="soft"
            :label="t('pwa.notifyEnable')"
            @click="enableNotifications"
          />
        </div>
        <p v-else-if="notifPermission === 'granted'" class="flex items-center gap-1.5 text-xs text-success">
          <UIcon name="i-lucide-bell-ring" class="size-3.5 shrink-0" />
          {{ t('pwa.notifyEnabled') }}
        </p>
        <p v-else class="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <UIcon name="i-lucide-bell-off" class="size-3.5 shrink-0" />
          {{ t('pwa.notifyBlocked') }}
        </p>
      </div>

      <div v-if="!hasItems" class="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <UIcon name="i-lucide-check-circle" class="size-8 text-success" />
        <p class="text-sm text-on-surface-variant">
          {{ t('pwa.logEmpty') }}
        </p>
      </div>

      <div v-else class="space-y-5">
        <!-- Offline recitation drafts -->
        <section v-if="drafts.length" class="space-y-2">
          <h4 class="text-xs font-semibold uppercase text-on-surface-variant">
            {{ t('pwa.logDrafts') }}
          </h4>
          <div
            v-for="d in drafts"
            :key="d.id"
            class="flex items-center gap-3 p-3 rounded-xl bg-elevated"
          >
            <UIcon name="i-lucide-book-open" class="size-4 text-primary shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-highlighted truncate">
                {{ draftLabel(d) }}
              </p>
              <p class="text-xs text-on-surface-variant">
                {{ fmtTime(d.updatedAt) }}<span v-if="d.approve"> · {{ t('pwa.logApproved') }}</span>
              </p>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="t('pwa.discard')"
              @click="deleteDraft(d.id)"
            />
          </div>
        </section>

        <!-- Pending outbox (attendance syncs, deletes) -->
        <section v-if="pending.length" class="space-y-2">
          <h4 class="text-xs font-semibold uppercase text-on-surface-variant">
            {{ t('pwa.logPending') }}
          </h4>
          <div
            v-for="e in pending"
            :key="e.id"
            class="flex items-center gap-3 p-3 rounded-xl bg-elevated"
          >
            <UIcon
              :name="e.kind === 'achievement-delete' ? 'i-lucide-trash-2' : 'i-lucide-user-check'"
              class="size-4 text-primary shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-highlighted truncate">
                {{ outboxLabel(e) }}
              </p>
              <p class="text-xs text-on-surface-variant">
                {{ fmtTime(e.createdAt) }}
              </p>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="t('pwa.discard')"
              @click="discard(e.id)"
            />
          </div>
        </section>

        <!-- Failed (needs attention) -->
        <section v-if="failed.length" class="space-y-2">
          <h4 class="text-xs font-semibold uppercase text-error">
            {{ t('pwa.logFailed') }}
          </h4>
          <div
            v-for="e in failed"
            :key="e.id"
            class="flex items-center gap-3 p-3 rounded-xl bg-error/5 border border-error/20"
          >
            <UIcon name="i-lucide-alert-triangle" class="size-4 text-error shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-highlighted truncate">
                {{ outboxLabel(e) }}
              </p>
              <p class="text-xs text-error truncate">
                {{ e.error }}
              </p>
            </div>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="!online"
              :aria-label="t('pwa.retry')"
              @click="retry(e.id)"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="t('pwa.discard')"
              @click="discard(e.id)"
            />
          </div>
        </section>
      </div>
    </DefineBody>

    <DefineFooter>
      <div class="flex items-center justify-between w-full gap-3">
        <span class="text-xs text-on-surface-variant flex items-center gap-1.5">
          <UIcon :name="online ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" class="size-3.5" />
          {{ online ? t('pwa.online') : t('pwa.offline') }}
        </span>
        <UButton
          icon="i-lucide-refresh-cw"
          size="sm"
          :label="t('pwa.logSyncNow')"
          :loading="syncing"
          :disabled="!online || !hasItems"
          @click="syncNow"
        />
      </div>
    </template>
  </USlideover>
</template>
