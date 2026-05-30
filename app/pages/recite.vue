<script setup lang="ts">
import { LazyCommonConfirmDialog } from '#components'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import type { ApiAchievement, ApiStudent, ApiWeeklyPlanItem, CreateAchievementDto } from '~/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const api = useApi()
const overlay = useOverlay()
const { user, activeRole } = useAuth()

// Parent role gets a read-only experience: prior recitations are visible
// (without mistake counters) but the toolbar + tap interactions are hidden.
// A user with multiple roles (e.g. principal + parent) only enters read-only
// when they're *actively* in the parent role — checking the user's role
// array would lock principals out of editing.
const isParentReadOnly = computed(() => activeRole.value === 'parent')

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
    // Single-record fetch — used to be `GET /students?halaqa_id=N` which
    // returns the whole halaqa just to read one name. Direct lookup is one
    // tiny payload instead of ~30 ApiStudent records.
    student.value = await api<ApiStudent>(`/students/${studentId.value}`)
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

// Preload the first page's font + JSON via <link rel="preload"> so the
// browser starts fetching them BEFORE Vue mounts MushafRangeViewer. Saves
// ~50-100ms on the cold path because the request goes out during route
// transition instead of during component setup.
const { pageFor } = useVerseToPage()
const firstPageNumber = computed(() => {
  const item = selectedItem.value
  if (!item) return null
  return pageFor(`${item.start_surah}:${item.start_verse}`) ?? null
})

useHead(() => {
  const p = firstPageNumber.value
  if (!p) return {}
  return {
    link: [
      { rel: 'preload', as: 'fetch', href: `/quran/pages/${p}.json`, crossorigin: 'anonymous' },
      { rel: 'preload', as: 'font', type: 'font/woff2', href: `/quran/fonts/v1/p${p}.woff2`, crossorigin: 'anonymous' }
    ]
  }
})

// ── Prior achievements for this student + halaqa + date (Phase 5 item 1) ───
// Shows the teacher what's already been recorded so they don't double-submit,
// and gives the parent role context for the day.
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

// ── Marking session ─────────────────────────────────────────────────────────
// One autosave bucket per (student, date, plan item) so a teacher can
// switch students mid-session and come back without losing marks.
const sessionId = computed(() =>
  selectedItem.value && studentId.value
    ? `${studentId.value}:${dateStr.value}:${selectedItem.value.id}`
    : ''
)
const { mode, marks, counts, tap, clearAll } = useRecitationSession(sessionId)

// ── Submit with confirmation (Phase 5 item 3) ──────────────────────────────
const submitting = ref(false)

function onSubmitRequest() {
  const item = selectedItem.value
  if (!item || !studentId.value || !halaqaId.value) return
  if (counts.value.total === 0) return

  const c = counts.value
  const modal = overlay.create(LazyCommonConfirmDialog, {
    destroyOnClose: true,
    props: {
      'open': true,
      'title': 'تأكيد حفظ الإنجاز',
      'message':
        `هل تريد حفظ إنجاز ${trackLabel(item.track_type)} لـ${rangeLabel(item)}؟`
        + `\n${c.mistake} خطأ، ${c.warning} تنبيه، ${c.tajweed} تجويد.`,
      'confirmLabel': 'حفظ',
      'cancelLabel': 'إلغاء',
      'loading': false,
      'onUpdate:open': (v: boolean) => { if (!v) modal.close() },
      async onConfirm() {
        try {
          modal.patch({ loading: true })
          await postAchievement(item, studentId.value!, halaqaId.value!)
          // close() destroys the overlay outright — patching `open: false`
          // first races with the dialog's own v-model sync and can leave
          // the backdrop visible until the next interaction.
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
  // overlay.create() merely registers the modal — open() actually mounts it.
  modal.open()
}

async function postAchievement(item: ApiWeeklyPlanItem, sid: number, hid: number) {
  submitting.value = true
  try {
    const c = counts.value
    const dto: CreateAchievementDto = {
      student_id: sid,
      halaqa_id: hid,
      date: dateStr.value,
      track_type: item.track_type,
      start_surah: item.start_surah,
      start_verse: item.start_verse,
      end_surah: item.end_surah,
      end_verse: item.end_verse,
      mistakes_count: c.mistake,
      warnings_count: c.warning,
      tajweed_errors_count: c.tajweed
    }
    const created = await api<ApiAchievement>('/achievements', { method: 'POST', body: dto })
    // Optimistically prepend to the prior list so it's visible immediately
    // without a second round-trip.
    priorAchievements.value = [created, ...priorAchievements.value]
    clearAll()
    toast.add({
      title: 'تم حفظ الإنجاز ✓',
      description: `${c.mistake} خطأ، ${c.warning} تنبيه، ${c.tajweed} تجويد`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } finally {
    submitting.value = false
  }
}

// ── Pretty labels ───────────────────────────────────────────────────────────
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
          <p class="text-[10px] font-bold uppercase tracking-widest text-primary">
            {{ isParentReadOnly ? 'تلاوة اليوم — للعرض فقط' : 'تلاوة في المصحف' }}
          </p>
          <p class="text-base font-bold truncate text-on-surface">
            {{ studentLoading ? '…' : (student?.name ?? `طالب #${studentId}`) }}
          </p>
        </div>
        <span class="text-xs text-on-surface-variant whitespace-nowrap">{{ dateStr }}</span>
      </header>

      <!-- ── Prior achievements strip (Phase 5 item 1) ────────────────── -->
      <section
        v-if="priorAchievements.length || priorLoading"
        class="recite-page__prior"
        dir="rtl"
      >
        <div class="recite-page__prior-header">
          <UIcon name="i-lucide-check-square" class="size-4 text-primary" />
          <span>تم تسجيله اليوم ({{ priorAchievements.length }})</span>
          <span v-if="priorLoading" class="recite-page__prior-loading">…</span>
        </div>
        <ul class="recite-page__prior-list">
          <li
            v-for="a in priorAchievements"
            :key="a.id"
            :class="['recite-page__prior-item', `recite-page__prior-item--${a.track_type.toLowerCase()}`]"
          >
            <span class="recite-page__prior-track">{{ trackLabel(a.track_type) }}</span>
            <span class="recite-page__prior-range">{{ rangeLabel(a) }}</span>
            <!-- Mistake counters are hidden from parents per the backend's
                 own role-based redaction policy. -->
            <span v-if="!isParentReadOnly" class="recite-page__prior-counts">
              {{ a.mistakes_count }}خ · {{ a.warnings_count }}ت · {{ a.tajweed_errors_count }}ج
            </span>
          </li>
        </ul>
      </section>

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
        <p v-if="!isParentReadOnly" class="text-xs text-on-surface-variant">
          يجب إنشاء الخطة من صفحة المخطط أولاً.
        </p>
        <UButton v-if="!isParentReadOnly" to="/planner" variant="soft" color="primary" size="sm">
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

        <!-- Sticky mark toolbar — hidden for parent (Phase 5 item 5) -->
        <div v-if="!isParentReadOnly" class="recite-page__sticky">
          <MushafMarkToolbar
            :mode="mode"
            :counts="counts"
            :can-submit="counts.total > 0 && !!selectedItem"
            :submitting="submitting"
            @update:mode="mode = $event"
            @clear="clearAll"
            @submit="onSubmitRequest"
          />
        </div>

        <!-- The mushaf, sized to the assigned range -->
        <!-- Parent role: no tap handler so words aren't tappable -->
        <MushafRangeViewer
          v-if="selectedItem"
          :start-surah="selectedItem.start_surah"
          :start-verse="selectedItem.start_verse"
          :end-surah="selectedItem.end_surah"
          :end-verse="selectedItem.end_verse"
          :marks="isParentReadOnly ? undefined : marks"
          :on-word-tap="isParentReadOnly ? undefined : tap"
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

/* Prior recitations strip */
.recite-page__prior {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
}

.recite-page__prior-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-on-surface-variant);
  margin-bottom: 0.5rem;
}

.recite-page__prior-loading {
  margin-inline-start: auto;
  color: var(--color-primary);
}

.recite-page__prior-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.recite-page__prior-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-card-border);
}

.recite-page__prior-item--hifz { color: var(--color-track-hifz); border-color: var(--color-track-hifz-bg); background: var(--color-track-hifz-bg); }
.recite-page__prior-item--near { color: var(--color-track-near); border-color: var(--color-track-near-bg); background: var(--color-track-near-bg); }
.recite-page__prior-item--far { color: var(--color-track-far); border-color: var(--color-track-far-bg); background: var(--color-track-far-bg); }

.recite-page__prior-track {
  font-weight: 700;
}

.recite-page__prior-range {
  opacity: 0.85;
}

.recite-page__prior-counts {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  margin-inline-start: auto;
}
</style>
