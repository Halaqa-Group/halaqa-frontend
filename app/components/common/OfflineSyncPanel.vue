<script setup lang="ts">
// Full log of everything waiting to sync: offline recitation drafts, queued
// attendance syncs, queued deletes, and anything that permanently failed — with
// per-item discard/retry and a "sync now" action. Opened from the status badge.
import { useOnline } from '@vueuse/core'
import type { OutboxEntry } from '~/composables/useOfflineOutbox'
import type { AchievementDraft } from '~/composables/useAchievementDrafts'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const online = useOnline()
const { pending, failed, flush, retry, discard } = useOfflineOutbox()
const { drafts, deleteDraft, flush: flushDrafts } = useAchievementDrafts()

const hasItems = computed(() => pending.value.length + failed.value.length + drafts.value.length > 0)
const syncing = ref(false)

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
  return new Date(ts).toLocaleString()
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
  <USlideover v-model:open="open" :title="t('pwa.logTitle')" :description="t('pwa.logSubtitle')" :ui="{ content: 'pt-[env(safe-area-inset-top)]', close: 'top-[calc(env(safe-area-inset-top)+1rem)]' }">
    <template #body>
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
    </template>

    <template #footer>
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
