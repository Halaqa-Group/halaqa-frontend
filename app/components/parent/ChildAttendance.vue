<script setup lang="ts">
import type { ApiAttendance, AttendanceStatus } from '~/types'
import type { BadgeColor } from '~/utils/halaqa'

const props = defineProps<{
  records: ApiAttendance[]
  loading?: boolean
}>()

const { t, locale } = useI18n()

// `text` is a literal static class so Tailwind's content scanner keeps it.
const STATUS_META: Record<AttendanceStatus, { color: BadgeColor, icon: string, text: string }> = {
  present: { color: 'success', icon: 'i-lucide-check', text: 'text-success' },
  late: { color: 'warning', icon: 'i-lucide-clock', text: 'text-warning' },
  absent: { color: 'error', icon: 'i-lucide-x', text: 'text-error' },
  excused: { color: 'info', icon: 'i-lucide-shield-check', text: 'text-info' }
}

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
)

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateFormatter.value.format(d)
}

// Newest first.
const sorted = computed(() =>
  [...props.records].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
)

const summary = computed(() => {
  const counts: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0, excused: 0 }
  for (const r of props.records) counts[r.status]++
  return counts
})

const statusOrder: AttendanceStatus[] = ['present', 'late', 'absent', 'excused']
</script>

<template>
  <div class="pt-4">
    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin text-primary" />
    </div>

    <div v-else-if="sorted.length === 0" class="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <UIcon name="i-lucide-user-check" class="w-9 h-9 text-muted" />
      <p class="text-sm text-muted">
        {{ t('pages.parent.child.attendance.empty') }}
      </p>
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          v-for="s in statusOrder"
          :key="s"
          class="rounded-lg border border-default p-3 text-center"
        >
          <p class="text-xs text-muted mb-1">
            {{ t(`attendance.status.${s}`) }}
          </p>
          <p class="text-xl font-bold tabular-nums" :class="STATUS_META[s].text">
            {{ summary[s] }}
          </p>
        </div>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <ul class="divide-y divide-default">
          <li
            v-for="r in sorted"
            :key="r.id"
            class="flex items-center gap-3 p-4"
          >
            <UIcon
              :name="STATUS_META[r.status].icon"
              class="w-4 h-4 shrink-0"
              :class="STATUS_META[r.status].text"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">
                {{ formatDate(r.date) }}
              </p>
              <p v-if="r.excuse_note" class="text-xs text-muted truncate">
                {{ r.excuse_note }}
              </p>
            </div>
            <UBadge variant="subtle" size="sm" :color="STATUS_META[r.status].color">
              {{ t(`attendance.status.${r.status}`) }}
            </UBadge>
          </li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
