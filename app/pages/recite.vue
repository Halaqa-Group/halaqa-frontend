<script setup lang="ts">
import { LazyCommonConfirmDialog } from '#components'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { computePercentageScore } from '~/utils/score'
import { TRACK_BADGE_COLOR, TRACK_ICON, type AchievementTrack } from '~/utils/achievement'
import type { ApiAchievement, ApiStudent, ApiWeeklyPlanItem, CreateAchievementDto } from '~/types'
import type { MarkCounts } from '~/types/recitation'
import { toScoreCounts } from '~/types/recitation'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const api = useApi()
const overlay = useOverlay()
const { activeRole } = useAuth()
const { loadEvaluationSettings } = useAchievements()

const isParentReadOnly = computed(() => activeRole.value === 'parent')

const halaqaId = computed(() => {
  const v = Number(route.query.halaqa_id)
  return Number.isFinite(v) && v > 0 ? v : null
})
const studentId = computed(() => {
  const v = Number(route.query.student_id)
  return Number.isFinite(v) && v > 0 ? v : null
})
const dateStr = computed(() => {
  const q = route.query.date
  const v = Array.isArray(q) ? q[0] : q
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const student = ref<ApiStudent | null>(null)
const studentLoading = ref(false)

async function loadStudent() {
  if (!studentId.value || !halaqaId.value) {
    student.value = null
    return
  }
  studentLoading.value = true
  try {
    student.value = await api<ApiStudent>(`/students/${studentId.value}`)
  } catch {
    student.value = null
  } finally {
    studentLoading.value = false
  }
}
watch([studentId, halaqaId], loadStudent, { immediate: true })

const { items: todayItems, plan, loading: planLoading, error: planError }
  = useTodayPlanItems(studentId, halaqaId, dateStr)

const selectedItemId = ref<number | null>(null)
watch(todayItems, (items) => {
  if (!items.length) {
    selectedItemId.value = null
    return
  }
  if (!selectedItemId.value || !items.some(i => i.id === selectedItemId.value)) {
    selectedItemId.value = items[0]!.id
  }
}, { immediate: true })

const selectedItem = computed<ApiWeeklyPlanItem | null>(() =>
  todayItems.value.find(i => i.id === selectedItemId.value) ?? null
)

const PRELOAD_LIMIT = 3
const { pageFor } = useVerseToPage()

const pageRange = computed<number[]>(() => {
  const item = selectedItem.value
  if (!item) return []
  const start = pageFor(`${item.start_surah}:${item.start_verse}`)
  const end = pageFor(`${item.end_surah}:${item.end_verse}`)
  if (!start || !end || end < start) return []
  const out: number[] = []
  for (let p = start; p <= end; p++) out.push(p)
  return out
})

useHead(() => {
  const pages = pageRange.value
  if (!pages.length) return {}
  const preload = pages.slice(0, PRELOAD_LIMIT)
  const prefetch = pages.slice(PRELOAD_LIMIT)
  return {
    link: [
      ...preload.flatMap(p => [
        { rel: 'preload', as: 'fetch', href: `/quran/pages/${p}.json`, crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: `/quran/fonts/v1/p${p}.woff2`, crossorigin: 'anonymous' }
      ]),
      ...prefetch.flatMap(p => [
        { rel: 'prefetch', as: 'fetch', href: `/quran/pages/${p}.json`, crossorigin: 'anonymous' },
        { rel: 'prefetch', as: 'font', type: 'font/woff2', href: `/quran/fonts/v1/p${p}.woff2`, crossorigin: 'anonymous' }
      ])
    ]
  }
})

const priorAchievements = ref<ApiAchievement[]>([])
const priorLoading = ref(false)

async function loadPrior() {
  if (!studentId.value || !halaqaId.value) {
    priorAchievements.value = []
    return
  }
  priorLoading.value = true
  try {
    const raw = await api<ApiAchievement[] | { items: ApiAchievement[] }>(
      `/achievements?student_id=${studentId.value}&halaqa_id=${halaqaId.value}&date=${dateStr.value}`
    )
    priorAchievements.value = Array.isArray(raw) ? raw : (raw.items ?? [])
  } catch {
    priorAchievements.value = []
  } finally {
    priorLoading.value = false
  }
}
watch([studentId, halaqaId, dateStr], loadPrior, { immediate: true })

const sessionId = computed(() =>
  selectedItem.value && studentId.value
    ? `${studentId.value}:${dateStr.value}:${selectedItem.value.id}`
    : ''
)
const { marks, counts, tap, setMarks, clearAll } = useRecitationSession(sessionId)

// One-line breakdown of the four severity levels, reused in the confirm dialog
// and the success toasts.
function countsSummary(c: MarkCounts): string {
  return `${c.severe} جسيم، ${c.medium} متوسط، ${c.light} خفيف، ${c.minor} تنبيه`
}

const submitting = ref(false)

// An achievement already recorded today for this exact session (same track +
// range). Re-submitting updates it instead of creating a duplicate.
function findExistingAchievement(item: ApiWeeklyPlanItem): ApiAchievement | null {
  return priorAchievements.value.find(a =>
    a.track_type === item.track_type
    && a.start_surah === item.start_surah && a.start_verse === item.start_verse
    && a.end_surah === item.end_surah && a.end_verse === item.end_verse
  ) ?? null
}

function onSubmitRequest() {
  const item = selectedItem.value
  if (!item || !studentId.value || !halaqaId.value) return

  const c = counts.value
  const existing = findExistingAchievement(item)
  const verb = existing ? 'تحديث' : 'حفظ'
  const modal = overlay.create(LazyCommonConfirmDialog, {
    destroyOnClose: true,
    props: {
      'open': true,
      'title': existing ? 'تأكيد تحديث الجلسة' : 'تأكيد حفظ الإنجاز',
      'message':
        `هل تريد ${verb} إنجاز ${trackLabel(item.track_type)} لـ${rangeLabel(item)}؟`
        + (c.total === 0
          ? '\nتلاوة تامة بدون أخطاء ✓'
          : `\n${countsSummary(c)}.`),
      'confirmLabel': verb,
      'cancelLabel': 'إلغاء',
      'loading': false,
      'onUpdate:open': (v: boolean) => { if (!v) modal.close() },
      async onConfirm() {
        try {
          modal.patch({ loading: true })
          await postAchievement(item, studentId.value!, halaqaId.value!)
          modal.close()
        } catch (e) {
          modal.patch({ loading: false })
          const err = e as { data?: { message?: string }, message?: string }
          toast.add({
            title: 'خطأ في حفظ الإنجاز',
            description: err.data?.message || err.message || 'حدث خطأ غير معروف',
            color: 'error',
            icon: 'i-lucide-alert-circle'
          })
        }
      }
    }
  })
  modal.open()
}

async function postAchievement(item: ApiWeeklyPlanItem, sid: number, hid: number) {
  submitting.value = true
  try {
    const c = counts.value
    const scoreCounts = toScoreCounts(c)
    const settings = await loadEvaluationSettings(hid)
    const score = computePercentageScore(scoreCounts, settings)
    const existing = findExistingAchievement(item)

    if (existing) {
      if (existing.status === 'approved') {
        throw new Error('هذا الإنجاز معتمد ولا يمكن تعديله. ألغِ الاعتماد أولاً.')
      }
      // Update the same session instead of creating a duplicate.
      const updated = await api<ApiAchievement>(`/achievements/${existing.id}`, {
        method: 'PATCH',
        body: {
          track_type: item.track_type,
          start_surah: item.start_surah,
          start_verse: item.start_verse,
          end_surah: item.end_surah,
          end_verse: item.end_verse,
          mistakes_count: scoreCounts.mistakes_count,
          warnings_count: scoreCounts.warnings_count,
          tajweed_errors_count: scoreCounts.tajweed_errors_count,
          percentage_score: score
        }
      })
      priorAchievements.value = priorAchievements.value.map(a => a.id === existing.id ? updated : a)
      clearAll()
      toast.add({
        title: 'تم تحديث الجلسة ✓',
        description: countsSummary(c),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return
    }

    const dto: CreateAchievementDto = {
      student_id: sid,
      halaqa_id: hid,
      date: dateStr.value,
      track_type: item.track_type,
      start_surah: item.start_surah,
      start_verse: item.start_verse,
      end_surah: item.end_surah,
      end_verse: item.end_verse,
      mistakes_count: scoreCounts.mistakes_count,
      warnings_count: scoreCounts.warnings_count,
      tajweed_errors_count: scoreCounts.tajweed_errors_count,
      percentage_score: score
    }
    const created = await api<ApiAchievement>('/achievements', { method: 'POST', body: dto })
    priorAchievements.value = [created, ...priorAchievements.value]
    clearAll()
    toast.add({
      title: 'تم حفظ الإنجاز ✓',
      description: countsSummary(c),
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } finally {
    submitting.value = false
  }
}

function rangeLabel(item: Pick<ApiWeeklyPlanItem, 'start_surah' | 'start_verse' | 'end_surah' | 'end_verse'>): string {
  const ss = SURAH_NAMES[item.start_surah] ?? `${item.start_surah}`
  if (item.start_surah === item.end_surah) {
    return `${ss} ${item.start_verse}–${item.end_verse}`
  }
  const es = SURAH_NAMES[item.end_surah] ?? `${item.end_surah}`
  return `${ss} ${item.start_verse} ← ${es} ${item.end_verse}`
}

function trackLabel(track: ApiWeeklyPlanItem['track_type']): string {
  return TRACK_TYPES.find(t => t.value === track)?.label ?? track
}

const missingArgs = computed(() => !halaqaId.value || !studentId.value)

// The mark toolbar shows as a sticky bottom bar while a lesson is selected.
const showToolbar = computed(() => !isParentReadOnly.value && !!selectedItem.value)
</script>

<template>
  <div class="flex flex-col gap-3 max-w-[640px] mx-auto w-full pb-6">
    <div
      v-if="missingArgs"
      class="mx-auto my-8 max-w-sm w-full flex flex-col items-center gap-3 text-center px-6 py-10 rounded-2xl border border-default bg-default"
    >
      <UIcon name="i-lucide-book-open-text" class="w-12 h-12 text-primary opacity-70" />
      <h2 class="text-lg font-bold">
        اختر طالبًا للبدء
      </h2>
      <p class="text-sm text-muted">
        افتح صفحة الإنجازات، اختر الطالب، ثم اضغط زر «تلاوة في المصحف» للوصول إلى هذه الصفحة.
      </p>
      <UButton to="/achievements" icon="i-lucide-arrow-left" size="lg" color="primary">
        اذهب إلى صفحة الإنجازات
      </UButton>
    </div>

    <template v-else>
      <div class="flex items-center gap-3 rounded-xl border border-default bg-default px-3 py-2.5">
        <UButton
          icon="i-lucide-arrow-right"
          variant="ghost"
          color="neutral"
          square
          :aria-label="'رجوع'"
          @click="router.push('/achievements')"
        />
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-wide text-primary">
            {{ isParentReadOnly ? 'تلاوة اليوم — للعرض فقط' : 'تلاوة في المصحف' }}
          </p>
          <p class="text-base font-bold truncate">
            {{ studentLoading ? '…' : (student?.name ?? `طالب #${studentId}`) }}
          </p>
        </div>
        <UBadge color="neutral" variant="subtle" size="sm" class="shrink-0 tabular-nums hidden sm:inline-flex">
          {{ dateStr }}
        </UBadge>

        <!-- "Recorded today" collapsed into a chip + popover to save vertical space -->
        <UPopover v-if="priorAchievements.length">
          <UButton size="sm" variant="soft" color="primary" icon="i-lucide-check-square" class="shrink-0 tabular-nums">
            {{ priorAchievements.length }}
          </UButton>
          <template #content>
            <div class="p-3 w-64 max-h-72 overflow-auto" dir="rtl">
              <p class="text-xs font-semibold text-muted mb-2">
                تم تسجيله اليوم ({{ priorAchievements.length }})
              </p>
              <ul class="flex flex-col items-start gap-1.5">
                <li v-for="a in priorAchievements" :key="a.id">
                  <UBadge :color="TRACK_BADGE_COLOR[a.track_type as AchievementTrack]" variant="subtle" class="gap-1.5">
                    <span class="font-bold">{{ trackLabel(a.track_type) }}</span>
                    <span class="opacity-80">{{ rangeLabel(a) }}</span>
                    <span v-if="!isParentReadOnly" class="tabular-nums opacity-70">
                      · {{ a.mistakes_count }}خ {{ a.warnings_count }}ت {{ a.tajweed_errors_count }}ج
                    </span>
                  </UBadge>
                </li>
              </ul>
            </div>
          </template>
        </UPopover>
      </div>

      <div v-if="planLoading" class="flex items-center justify-center gap-2 py-6 text-sm text-muted">
        <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
        جارٍ تحميل خطة اليوم…
      </div>

      <div v-else-if="planError" class="flex items-center justify-center gap-2 py-6 text-sm text-error" dir="ltr">
        <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
        Couldn't load this week's plan — {{ planError.message }}
      </div>

      <div
        v-else-if="!plan"
        class="mx-auto max-w-sm w-full flex flex-col items-center gap-2 text-center px-6 py-8 rounded-2xl border border-default bg-default"
      >
        <UIcon name="i-lucide-calendar-off" class="w-8 h-8 text-muted opacity-70" />
        <p class="text-sm font-medium">
          لا توجد خطة أسبوعية معتمدة لهذا الطالب.
        </p>
        <p v-if="!isParentReadOnly" class="text-xs text-muted">
          يجب إنشاء الخطة من صفحة المخطط أولاً.
        </p>
        <UButton v-if="!isParentReadOnly" to="/planner" variant="soft" color="primary" size="sm">
          فتح المخطط
        </UButton>
      </div>

      <div
        v-else-if="!todayItems.length"
        class="mx-auto max-w-sm w-full flex flex-col items-center gap-2 text-center px-6 py-8 rounded-2xl border border-default bg-default"
      >
        <UIcon name="i-lucide-coffee" class="w-8 h-8 text-muted opacity-70" />
        <p class="text-sm font-medium">
          لا يوجد مقرر مخطط لهذا اليوم.
        </p>
      </div>

      <template v-else>
        <div
          v-if="todayItems.length > 1"
          class="flex items-center gap-3 rounded-xl border border-default bg-default px-3 py-2.5"
          dir="rtl"
        >
          <span class="shrink-0 hidden sm:inline-flex items-center gap-1 text-xs font-medium text-muted">
            <UIcon name="i-lucide-pointer" class="w-3.5 h-3.5" />
            اختر الجلسة
          </span>
          <UButton
            v-for="item in todayItems"
            :key="item.id"
            size="sm"
            :variant="selectedItemId === item.id ? 'solid' : 'outline'"
            :color="TRACK_BADGE_COLOR[item.track_type as AchievementTrack]"
            :icon="TRACK_ICON[item.track_type as AchievementTrack]"
            :trailing-icon="selectedItemId === item.id ? 'i-lucide-check' : undefined"
            :ui="{ label: 'truncate' }"
            class="flex-1 min-w-0 justify-center cursor-pointer"
            @click="selectedItemId = item.id"
          >
            {{ trackLabel(item.track_type) }}
          </UButton>
        </div>

        <MushafRangeViewer
          v-if="selectedItem"
          :start-surah="selectedItem.start_surah"
          :start-verse="selectedItem.start_verse"
          :end-surah="selectedItem.end_surah"
          :end-verse="selectedItem.end_verse"
          :marks="isParentReadOnly ? undefined : marks"
          :on-word-tap="isParentReadOnly ? undefined : tap"
          :on-words-mark="isParentReadOnly ? undefined : setMarks"
        />
      </template>

      <!-- Marking controls pinned to the bottom. `sticky` keeps it inside the
           640px content column so it stays aligned/centered with the mushaf
           (a `fixed` bar would center against the whole window, off to the side
           of the sidebar). -->
      <div v-if="showToolbar" class="sticky bottom-3 z-30 mt-1">
        <MushafMarkToolbar
          :counts="counts"
          :can-submit="!!selectedItem"
          :submitting="submitting"
          @clear="clearAll"
          @submit="onSubmitRequest"
        />
      </div>
    </template>
  </div>
</template>
