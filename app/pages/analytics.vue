<script setup lang="ts">
import type { ApiWarnings } from '~/types'

definePageMeta({ layout: 'dashboard' })

const { t } = useI18n()
const api = useApi()
const { halaqat, fetchHalaqat } = useHalaqat()

const selectedHalaqaId = ref<number | null>(null)
const selectedWeekStart = ref(getMonday(new Date()))
const warnings = ref<ApiWarnings | null>(null)
const isLoading = ref(false)
const error = ref('')

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

async function loadWarnings() {
  if (!selectedHalaqaId.value) return
  isLoading.value = true
  error.value = ''
  try {
    warnings.value = await api<ApiWarnings>(
      `/analytics/warnings?halaqaId=${selectedHalaqaId.value}&weekStartDate=${selectedWeekStart.value}`
    )
  } catch (e: any) {
    error.value = e?.data?.message || t('pages.analytics.errorFallback')
  } finally {
    isLoading.value = false
  }
}

function trackKey(trackType: string) {
  return trackType === 'Hifz' ? 'tracks.hifz' : trackType === 'Near' ? 'tracks.near' : 'tracks.far'
}

const halaqaItems = computed(() =>
  halaqat.value.map(h => ({ label: h.name, value: h.id }))
)

onMounted(async () => {
  await fetchHalaqat()
  if (halaqat.value.length > 0) {
    selectedHalaqaId.value = halaqat.value[0].id
    await loadWarnings()
  }
})

watch([selectedHalaqaId, selectedWeekStart], () => loadWarnings())
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header + controls -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          {{ $t('pages.analytics.performanceLabel') }}
        </span>
        <h2 class="display-lg" style="color: var(--color-on-surface);">
          {{ $t('pages.analytics.title') }}
        </h2>
        <p class="text-sm" style="color: var(--color-on-surface-variant);">
          {{ $t('pages.analytics.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <USelect
          v-model="selectedHalaqaId"
          :items="halaqaItems"
          :placeholder="$t('pages.analytics.noHalaqat')"
          :disabled="halaqat.length === 0"
          icon="i-lucide-users"
          variant="none"
          class="px-3 py-2 rounded-xl bg-surface-container-lowest"
          style="box-shadow: var(--shadow-card);"
          :ui="{
            base: 'bg-transparent text-sm cursor-pointer text-on-surface ps-7 pe-2',
            leading: 'absolute inset-y-0 start-3 flex items-center',
            leadingIcon: 'w-4 h-4 text-on-surface-variant',
            trailing: 'pe-1'
          }"
        />

        <UInput
          v-model="selectedWeekStart"
          type="date"
          dir="ltr"
          leading-icon="i-lucide-calendar"
          variant="none"
          class="px-3 py-2 rounded-xl bg-surface-container-lowest"
          style="box-shadow: var(--shadow-card);"
          :ui="{
            base: 'bg-transparent text-sm text-on-surface ps-7 pe-2',
            leading: 'absolute inset-y-0 start-3 flex items-center',
            leadingIcon: 'w-4 h-4 text-on-surface-variant'
          }"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
    </div>

    <!-- No halaqa -->
    <div
      v-else-if="!selectedHalaqaId"
      class="flex flex-col items-center gap-3 py-16 rounded-2xl"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-bar-chart-3" class="w-12 h-12" style="color: var(--color-on-surface-variant);" />
      <p style="color: var(--color-on-surface-variant);">
        {{ $t('pages.analytics.selectHalaqaForAnalytics') }}
      </p>
    </div>

    <template v-else-if="warnings">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Unplanned -->
        <div class="rounded-2xl p-5" style="background-color: var(--color-status-warning-bg); box-shadow: var(--shadow-card);">
          <div class="flex items-center justify-between mb-2">
            <span class="label-md" style="color: var(--color-status-warning);">{{ $t('pages.analytics.unplanned.label') }}</span>
            <UIcon name="i-lucide-zap" class="w-5 h-5" style="color: var(--color-status-warning);" />
          </div>
          <p class="display-md" style="color: var(--color-status-warning);">
            {{ warnings.unplannedAchievements.length }}
          </p>
          <p class="body-sm mt-1" style="color: var(--color-status-warning);">
            {{ $t('pages.analytics.unplanned.thisWeek') }}
          </p>
        </div>

        <!-- Conflicts -->
        <div class="rounded-2xl p-5" style="background-color: var(--color-status-conflict-bg); box-shadow: var(--shadow-card);">
          <div class="flex items-center justify-between mb-2">
            <span class="label-md" style="color: var(--color-status-conflict);">{{ $t('pages.analytics.conflicts.label') }}</span>
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" style="color: var(--color-status-conflict);" />
          </div>
          <p class="display-md" style="color: var(--color-status-conflict);">
            {{ warnings.flaggedConflicts.length }}
          </p>
          <p class="body-sm mt-1" style="color: var(--color-status-conflict);">
            {{ $t('pages.analytics.conflicts.needsReview') }}
          </p>
        </div>

        <!-- Overdue -->
        <div class="rounded-2xl p-5" style="background-color: var(--color-status-overdue-bg); box-shadow: var(--shadow-card);">
          <div class="flex items-center justify-between mb-2">
            <span class="label-md" style="color: var(--color-status-overdue);">{{ $t('pages.analytics.overdue.label') }}</span>
            <UIcon name="i-lucide-clock-alert" class="w-5 h-5" style="color: var(--color-status-overdue);" />
          </div>
          <p class="display-md" style="color: var(--color-status-overdue);">
            {{ warnings.overdueItems.length }}
          </p>
          <p class="body-sm mt-1" style="color: var(--color-status-overdue);">
            {{ $t('pages.analytics.overdue.fromWeeklyPlan') }}
          </p>
        </div>
      </div>

      <!-- Unplanned achievements list -->
      <div
        v-if="warnings.unplannedAchievements.length > 0"
        class="rounded-2xl p-6"
        style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-card-border);"
      >
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-zap" class="w-5 h-5" style="color: var(--color-status-warning);" />
          <h3 class="body-lg font-semibold" style="color: var(--color-on-surface);">
            {{ $t('pages.analytics.unplanned.title') }}
          </h3>
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="a in warnings.unplannedAchievements"
            :key="a.id"
            class="flex items-center justify-between p-3 rounded-xl"
            style="background-color: var(--color-status-warning-bg);"
          >
            <div class="flex items-center gap-3">
              <img
                :src="`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(a.student?.name || String(a.student_id))}`"
                class="w-8 h-8 rounded-full"
                :alt="a.student?.name"
              >
              <div>
                <p class="body-md font-semibold" style="color: var(--color-on-surface);">
                  {{ a.student?.name || $t('pages.analytics.studentFallback', { id: a.student_id }) }}
                </p>
                <p class="label-sm" style="color: var(--color-on-surface-variant);">
                  {{ a.date }} — {{ $t(trackKey(a.track_type)) }}
                </p>
              </div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs"
              style="background-color: var(--color-status-warning-light); color: var(--color-status-warning);"
            >{{ $t('pages.analytics.unplanned.badge') }}</span>
          </div>
        </div>
      </div>

      <!-- Conflicts list -->
      <div
        v-if="warnings.flaggedConflicts.length > 0"
        class="rounded-2xl p-6"
        style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-card-border);"
      >
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" style="color: var(--color-status-conflict);" />
          <h3 class="body-lg font-semibold" style="color: var(--color-on-surface);">
            {{ $t('pages.analytics.conflicts.title') }}
          </h3>
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="a in warnings.flaggedConflicts"
            :key="a.id"
            class="flex items-center justify-between p-3 rounded-xl"
            style="background-color: var(--color-status-conflict-light);"
          >
            <div class="flex items-center gap-3">
              <img
                :src="`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(a.student?.name || String(a.student_id))}`"
                class="w-8 h-8 rounded-full"
                :alt="a.student?.name"
              >
              <div>
                <p class="body-md font-semibold" style="color: var(--color-on-surface);">
                  {{ a.student?.name || $t('pages.analytics.studentFallback', { id: a.student_id }) }}
                </p>
                <p class="label-sm" style="color: var(--color-on-surface-variant);">
                  {{ a.date }}
                </p>
              </div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs"
              style="background-color: var(--color-status-conflict-bg); color: var(--color-status-conflict);"
            >{{ $t('pages.analytics.conflicts.badge') }}</span>
          </div>
        </div>
      </div>

      <!-- All clear -->
      <div
        v-if="warnings.unplannedAchievements.length === 0 && warnings.flaggedConflicts.length === 0 && warnings.overdueItems.length === 0"
        class="flex flex-col items-center gap-3 py-16 rounded-2xl"
        style="background-color: var(--color-status-ok-bg);"
      >
        <UIcon name="i-lucide-check-circle" class="w-12 h-12" style="color: var(--color-status-ok);" />
        <p class="body-lg font-semibold" style="color: var(--color-status-ok);">
          {{ $t('pages.analytics.allClear.title') }}
        </p>
        <p class="body-sm" style="color: var(--color-status-ok);">
          {{ $t('pages.analytics.allClear.message') }}
        </p>
      </div>
    </template>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl p-6 text-center" style="background-color: var(--color-status-conflict-bg);">
      <p style="color: var(--color-status-conflict);">
        {{ error }}
      </p>
    </div>
  </div>
</template>
