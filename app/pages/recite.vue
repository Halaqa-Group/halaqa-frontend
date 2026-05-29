<script setup lang="ts">
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import type { ApiStudent, ApiWeeklyPlanItem, CreateAchievementDto } from '~/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const api = useApi()

// ── URL state ───────────────────────────────────────────────────────────────
// Driven by the query so a teacher can deep-link from /achievements, share
// a screen between devices, or refresh without losing context.
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

// ── Student details ─────────────────────────────────────────────────────────
const student = ref<ApiStudent | null>(null)
const studentLoading = ref(false)

async function loadStudent() {
  if (!studentId.value || !halaqaId.value) { student.value = null; return }
  studentLoading.value = true
  try {
    // Backend's OpenAPI uses snake_case query keys (halaqa_id, student_id, …).
    const raw = await api<ApiStudent[] | { items: ApiStudent[] }>(`/students?halaqa_id=${halaqaId.value}`)
    const list = Array.isArray(raw) ? raw : (raw.items ?? [])
    student.value = list.find(s => s.id === studentId.value) ?? null
  } catch {
    student.value = null
  } finally {
    studentLoading.value = false
  }
}
watch([studentId, halaqaId], loadStudent, { immediate: true })

// ── Today's plan items ──────────────────────────────────────────────────────
const { items: todayItems, plan, loading: planLoading, error: planError } =
  useTodayPlanItems(studentId, halaqaId, dateStr)

const selectedItemId = ref<number | null>(null)
// Default to the first item whenever the list changes (e.g. on student switch).
// Preserve the selection if it's still in the list.
watch(todayItems, (items) => {
  if (!items.length) { selectedItemId.value = null; return }
  if (!selectedItemId.value || !items.some(i => i.id === selectedItemId.value)) {
    selectedItemId.value = items[0]!.id
  }
}, { immediate: true })

const selectedItem = computed<ApiWeeklyPlanItem | null>(() =>
  todayItems.value.find(i => i.id === selectedItemId.value) ?? null
)

// ── Marking session ─────────────────────────────────────────────────────────
// One autosave bucket per (student, date, plan item) so a teacher can
// switch students mid-session and come back without losing marks.
const sessionId = computed(() =>
  selectedItem.value && studentId.value
    ? `${studentId.value}:${dateStr.value}:${selectedItem.value.id}`
    : ''
)
const { mode, marks, counts, tap, clearAll } = useRecitationSession(sessionId)

// ── Submit ──────────────────────────────────────────────────────────────────
const submitting = ref(false)

async function onSubmit() {
  const item = selectedItem.value
  if (!item || !studentId.value || !halaqaId.value) return
  submitting.value = true
  try {
    const dto: CreateAchievementDto = {
      student_id: studentId.value,
      halaqa_id: halaqaId.value,
      date: dateStr.value,
      track_type: item.track_type,
      start_surah: item.start_surah,
      start_verse: item.start_verse,
      end_surah: item.end_surah,
      end_verse: item.end_verse,
      mistakes_count: counts.value.mistake,
      warnings_count: counts.value.warning,
      tajweed_errors_count: counts.value.tajweed
    }
    await api('/achievements', { method: 'POST', body: dto })
    toast.add({
      title: 'تم حفظ الإنجاز ✓',
      description: `${counts.value.mistake} خطأ، ${counts.value.warning} تنبيه، ${counts.value.tajweed} تجويد`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    clearAll()
  } catch (e) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'خطأ في حفظ الإنجاز',
      description: err.data?.message || err.message || 'حدث خطأ غير معروف',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    submitting.value = false
  }
}

// ── Pretty range label for the item chip ────────────────────────────────────
function rangeLabel(item: ApiWeeklyPlanItem): string {
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

function trackColor(track: ApiWeeklyPlanItem['track_type']): 'primary' | 'error' | 'warning' {
  if (track === 'Hifz') return 'primary'
  if (track === 'Near') return 'error'
  return 'warning'
}

// Missing args → guide the user back to /achievements where they can pick.
const missingArgs = computed(() => !halaqaId.value || !studentId.value)
</script>

<template>
  <div class="recite-page">
    <!-- ── Empty state: nothing selected yet ──────────────────────────── -->
    <div v-if="missingArgs" class="recite-page__empty">
      <UIcon name="i-lucide-book-open-text" class="size-12 text-primary opacity-60" />
      <h2 class="text-xl font-bold text-on-surface">اختر طالبًا للبدء</h2>
      <p class="text-sm text-on-surface-variant text-center max-w-xs">
        افتح صفحة الإنجازات، اختر الطالب، ثم اضغط زر «تلاوة في المصحف» للوصول إلى هذه الصفحة.
      </p>
      <UButton
        to="/achievements"
        icon="i-lucide-arrow-left"
        size="lg"
        color="primary"
      >
        اذهب إلى صفحة الإنجازات
      </UButton>
    </div>

    <template v-else>
      <!-- ── Header: student + date + back ────────────────────────────── -->
      <header class="recite-page__header">
        <UButton
          icon="i-lucide-arrow-right"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="router.push('/achievements')"
        />
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-primary">تلاوة في المصحف</p>
          <p class="text-base font-bold truncate text-on-surface">
            {{ studentLoading ? '…' : (student?.name ?? `طالب #${studentId}`) }}
          </p>
        </div>
        <span class="text-xs text-on-surface-variant whitespace-nowrap">{{ dateStr }}</span>
      </header>

      <!-- ── Plan items: pick a track for today ──────────────────────── -->
      <div v-if="planLoading" class="recite-page__hint">
        <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
        جارٍ تحميل خطة اليوم…
      </div>

      <div v-else-if="planError" class="recite-page__error" dir="ltr">
        <UIcon name="i-lucide-alert-triangle" class="size-4" />
        Couldn't load this week's plan — {{ planError.message }}
      </div>

      <div v-else-if="!plan" class="recite-page__no-plan">
        <UIcon name="i-lucide-calendar-off" class="size-8 text-on-surface-variant opacity-60" />
        <p class="text-sm font-medium text-on-surface">لا توجد خطة أسبوعية معتمدة لهذا الطالب.</p>
        <p class="text-xs text-on-surface-variant">يجب إنشاء الخطة من صفحة المخطط أولاً.</p>
        <UButton to="/planner" variant="soft" color="primary" size="sm">
          فتح المخطط
        </UButton>
      </div>

      <div v-else-if="!todayItems.length" class="recite-page__no-plan">
        <UIcon name="i-lucide-coffee" class="size-8 text-on-surface-variant opacity-60" />
        <p class="text-sm font-medium text-on-surface">لا يوجد مقرر مخطط لهذا اليوم.</p>
      </div>

      <template v-else>
        <!-- Track-type chips when multiple items exist for today -->
        <div v-if="todayItems.length > 1" class="recite-page__items" dir="rtl">
          <UButton
            v-for="item in todayItems"
            :key="item.id"
            size="sm"
            :variant="selectedItemId === item.id ? 'solid' : 'soft'"
            :color="trackColor(item.track_type)"
            @click="selectedItemId = item.id"
          >
            {{ trackLabel(item.track_type) }} · {{ rangeLabel(item) }}
          </UButton>
        </div>

        <!-- Sticky mark toolbar -->
        <div class="recite-page__sticky">
          <MushafMarkToolbar
            :mode="mode"
            :counts="counts"
            :can-submit="counts.total > 0 && !!selectedItem"
            :submitting="submitting"
            @update:mode="mode = $event"
            @clear="clearAll"
            @submit="onSubmit"
          />
        </div>

        <!-- The mushaf, sized to the assigned range -->
        <MushafRangeViewer
          v-if="selectedItem"
          :start-surah="selectedItem.start_surah"
          :start-verse="selectedItem.start_verse"
          :end-surah="selectedItem.end_surah"
          :end-verse="selectedItem.end_verse"
          :marks="marks"
          :on-word-tap="tap"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.recite-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

.recite-page__empty,
.recite-page__no-plan {
  margin: 2rem auto;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-card-border);
  border-radius: 16px;
  text-align: center;
}

.recite-page__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
}

.recite-page__hint,
.recite-page__error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--color-on-surface-variant);
}

.recite-page__error {
  color: #b91c1c;
}

.recite-page__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.recite-page__sticky {
  position: sticky;
  top: 0.5rem;
  z-index: 10;
}
</style>
