<script setup lang="ts">
import type { ApiWarnings } from '~/types'

definePageMeta({ layout: 'dashboard' })

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
  }
  catch (e: any) {
    error.value = e?.data?.message || 'حدث خطأ أثناء تحميل التحليلات'
  }
  finally {
    isLoading.value = false
  }
}

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
        <span class="text-xs font-arabic font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          رصد الأداء
        </span>
        <h2 class="display-lg font-arabic" style="color: var(--color-on-surface);">التحليلات</h2>
        <p class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
          تنبيهات الأسبوع وتقارير الأداء والإنجاز.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div
          class="flex items-center gap-2 px-3 py-2 rounded-xl"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
        >
          <UIcon name="i-lucide-users" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
          <select
            v-model="selectedHalaqaId"
            class="bg-transparent text-sm font-arabic outline-none cursor-pointer"
            style="color: var(--color-on-surface);"
          >
            <option v-if="halaqat.length === 0" :value="null">لا توجد حلقات</option>
            <option v-for="h in halaqat" :key="h.id" :value="h.id">{{ h.name }}</option>
          </select>
        </div>

        <div
          class="flex items-center gap-2 px-3 py-2 rounded-xl"
          style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
        >
          <UIcon name="i-lucide-calendar" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
          <input
            v-model="selectedWeekStart"
            type="date"
            dir="ltr"
            class="bg-transparent text-sm font-arabic outline-none"
            style="color: var(--color-on-surface);"
          >
        </div>
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
      <p class="font-arabic" style="color: var(--color-on-surface-variant);">اختر حلقة لعرض التحليلات</p>
    </div>

    <template v-else-if="warnings">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Unplanned -->
        <div class="rounded-2xl p-5" style="background-color: #FFF3E0; box-shadow: var(--shadow-card);">
          <div class="flex items-center justify-between mb-2">
            <span class="label-md font-arabic" style="color: #F57C00;">إنجازات غير مخططة</span>
            <UIcon name="i-lucide-zap" class="w-5 h-5" style="color: #F57C00;" />
          </div>
          <p class="display-md" style="color: #F57C00;">{{ warnings.unplannedAchievements.length }}</p>
          <p class="body-sm font-arabic mt-1" style="color: #F57C00;">هذا الأسبوع</p>
        </div>

        <!-- Conflicts -->
        <div class="rounded-2xl p-5" style="background-color: #FCE4EC; box-shadow: var(--shadow-card);">
          <div class="flex items-center justify-between mb-2">
            <span class="label-md font-arabic" style="color: #D81B60;">تعارضات مكتشفة</span>
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" style="color: #D81B60;" />
          </div>
          <p class="display-md" style="color: #D81B60;">{{ warnings.flaggedConflicts.length }}</p>
          <p class="body-sm font-arabic mt-1" style="color: #D81B60;">يحتاج مراجعة</p>
        </div>

        <!-- Overdue -->
        <div class="rounded-2xl p-5" style="background-color: #E8EAF6; box-shadow: var(--shadow-card);">
          <div class="flex items-center justify-between mb-2">
            <span class="label-md font-arabic" style="color: #3949AB;">بنود متأخرة</span>
            <UIcon name="i-lucide-clock-alert" class="w-5 h-5" style="color: #3949AB;" />
          </div>
          <p class="display-md" style="color: #3949AB;">{{ warnings.overdueItems.length }}</p>
          <p class="body-sm font-arabic mt-1" style="color: #3949AB;">من الخطة الأسبوعية</p>
        </div>
      </div>

      <!-- Unplanned achievements list -->
      <div
        v-if="warnings.unplannedAchievements.length > 0"
        class="rounded-2xl p-6"
        style="background-color: white; border: 1px solid #F0F0F0;"
      >
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-zap" class="w-5 h-5" style="color: #F57C00;" />
          <h3 class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">الإنجازات غير المخططة</h3>
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="a in warnings.unplannedAchievements"
            :key="a.id"
            class="flex items-center justify-between p-3 rounded-xl"
            style="background-color: #FFF8F0;"
          >
            <div class="flex items-center gap-3">
              <img
                :src="`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(a.student?.name || String(a.student_id))}`"
                class="w-8 h-8 rounded-full"
                :alt="a.student?.name"
              >
              <div>
                <p class="body-md font-arabic font-semibold" style="color: var(--color-on-surface);">
                  {{ a.student?.name || `طالب #${a.student_id}` }}
                </p>
                <p class="label-sm font-arabic" style="color: var(--color-on-surface-variant);">
                  {{ a.date }} — {{ a.track_type === 'Hifz' ? 'حفظ' : a.track_type === 'Near' ? 'مراجعة قريبة' : 'مراجعة بعيدة' }}
                </p>
              </div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs font-arabic"
              style="background-color: #FFE0B2; color: #F57C00;"
            >غير مخطط</span>
          </div>
        </div>
      </div>

      <!-- Conflicts list -->
      <div
        v-if="warnings.flaggedConflicts.length > 0"
        class="rounded-2xl p-6"
        style="background-color: white; border: 1px solid #F0F0F0;"
      >
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" style="color: #D81B60;" />
          <h3 class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">التعارضات المكتشفة</h3>
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="a in warnings.flaggedConflicts"
            :key="a.id"
            class="flex items-center justify-between p-3 rounded-xl"
            style="background-color: #FFF0F3;"
          >
            <div class="flex items-center gap-3">
              <img
                :src="`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(a.student?.name || String(a.student_id))}`"
                class="w-8 h-8 rounded-full"
                :alt="a.student?.name"
              >
              <div>
                <p class="body-md font-arabic font-semibold" style="color: var(--color-on-surface);">
                  {{ a.student?.name || `طالب #${a.student_id}` }}
                </p>
                <p class="label-sm font-arabic" style="color: var(--color-on-surface-variant);">{{ a.date }}</p>
              </div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs font-arabic"
              style="background-color: #FCE4EC; color: #D81B60;"
            >تعارض</span>
          </div>
        </div>
      </div>

      <!-- All clear -->
      <div
        v-if="warnings.unplannedAchievements.length === 0 && warnings.flaggedConflicts.length === 0 && warnings.overdueItems.length === 0"
        class="flex flex-col items-center gap-3 py-16 rounded-2xl"
        style="background-color: #E0F0EE;"
      >
        <UIcon name="i-lucide-check-circle" class="w-12 h-12" style="color: #4A8E85;" />
        <p class="body-lg font-arabic font-semibold" style="color: #4A8E85;">لا توجد تنبيهات هذا الأسبوع</p>
        <p class="body-sm font-arabic" style="color: #4A8E85;">الحلقة تسير بشكل ممتاز</p>
      </div>
    </template>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl p-6 text-center" style="background-color: #FCE4EC;">
      <p class="font-arabic" style="color: #D81B60;">{{ error }}</p>
    </div>
  </div>
</template>
