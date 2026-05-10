<script setup lang="ts">
import type { Student, LessonCategory } from '~/types'

const {
  scheduleWithDates,
  selectedWeekStart,
  isEditMode,
  planStatus,
  selectedStudent,
  isSaving,
  saveAsDraft,
  approvePlan,
  startEditing,
  cancelEditing,
  loadPlan,
  resetState,
  applyColumnToAllDays,
  copyDayToAllDays,
  clearAllDays
} = useSchedule()

const { t } = useI18n()
const { students, fetchStudents } = useStudents()
const toast = useToast()

async function handleSaveAsDraft() {
  try {
    await saveAsDraft()
    toast.add({ title: t('pages.planner.savedDraftToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.saveErrorTitle'), description: e?.data?.message || e?.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleApprovePlan() {
  try {
    await approvePlan()
    toast.add({ title: t('pages.planner.approvedToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.approveErrorTitle'), description: e?.data?.message || e?.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

// ── Student pill (inline pill + prev/next) ──────────────────────────────
const isStudentPopoverOpen = ref(false)
const studentSearch = ref('')

const selectedStudentObj = computed(() =>
  students.value.find(s => s.name === selectedStudent.value) || null
)

const filteredDropdownStudents = computed(() =>
  studentSearch.value.trim()
    ? students.value.filter(s => s.name.includes(studentSearch.value.trim()))
    : students.value
)

const currentStudentIndex = computed(() =>
  selectedStudentObj.value
    ? students.value.findIndex(s => s.id === selectedStudentObj.value!.id)
    : -1
)

const canPrevStudent = computed(() => currentStudentIndex.value > 0)
const canNextStudent = computed(() =>
  currentStudentIndex.value !== -1 && currentStudentIndex.value < students.value.length - 1
)

function pickStudent(s: Student) {
  selectedStudent.value = s.name
  isStudentPopoverOpen.value = false
  studentSearch.value = ''
}

function prevStudent() {
  if (!canPrevStudent.value) return
  const prev = students.value[currentStudentIndex.value - 1]
  if (prev) selectedStudent.value = prev.name
}

function nextStudent() {
  if (!canNextStudent.value) return
  const next = students.value[currentStudentIndex.value + 1]
  if (next) selectedStudent.value = next.name
}

watch(selectedStudent, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    resetState()
    await loadPlan()
  }
})

// ── Confirmations: clear all, copy day, apply column ────────────────────
const isClearConfirmOpen = ref(false)
const isCopyDayConfirmOpen = ref(false)
const copyDayTargetId = ref<string | null>(null)
const isApplyColumnConfirmOpen = ref(false)
const applyColumnTarget = ref<LessonCategory | null>(null)

function requestClearAll() {
  isClearConfirmOpen.value = true
}
function doClearAll() {
  clearAllDays()
  toast.add({ title: t('pages.planner.topActions.clearedToast'), icon: 'i-lucide-eraser', color: 'primary' })
}

function requestCopyDay(dayId: string) {
  copyDayTargetId.value = dayId
  isCopyDayConfirmOpen.value = true
}
function doCopyDay() {
  if (!copyDayTargetId.value) return
  const ok = copyDayToAllDays(copyDayTargetId.value)
  copyDayTargetId.value = null
  if (ok) toast.add({ title: t('pages.planner.row.copiedToast'), icon: 'i-lucide-copy', color: 'primary' })
}

function requestApplyColumn(cat: LessonCategory) {
  applyColumnTarget.value = cat
  isApplyColumnConfirmOpen.value = true
}
function doApplyColumn() {
  if (!applyColumnTarget.value) return
  const ok = applyColumnToAllDays(applyColumnTarget.value)
  applyColumnTarget.value = null
  if (ok) {
    toast.add({ title: t('pages.planner.columns.appliedToast'), icon: 'i-lucide-copy', color: 'primary' })
  } else {
    toast.add({ title: t('pages.planner.columns.noFilledCell'), icon: 'i-lucide-info', color: 'neutral' })
  }
}

// ── Preview modal ───────────────────────────────────────────────────────
const isPreviewOpen = ref(false)

// ── Column header definitions ───────────────────────────────────────────
const columns: { key: LessonCategory, label: string, textClass: string, bgClass: string, icon: string }[] = [
  { key: 'mem', label: 'tracks.hifzNew', textClass: 'text-track-hifz', bgClass: 'bg-track-hifz-bg', icon: 'i-lucide-book-open' },
  { key: 'near', label: 'tracks.nearReview', textClass: 'text-track-near', bgClass: 'bg-track-near-bg', icon: 'i-lucide-rotate-ccw' },
  { key: 'far', label: 'tracks.farReview', textClass: 'text-track-far', bgClass: 'bg-track-far-bg', icon: 'i-lucide-library' }
]

onMounted(async () => {
  await fetchStudents()
  if (students.value[0] && !selectedStudent.value) {
    selectedStudent.value = students.value[0].name
  } else if (selectedStudent.value) {
    await loadPlan()
  }
})
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-6">
      <div class="space-y-1 min-w-0">
        <span class="text-xs font-bold uppercase tracking-widest text-primary">
          {{ $t('pages.planner.weeklyPlanning') }}
        </span>

        <div class="flex flex-wrap items-center gap-3">
          <h2 class="display-lg text-on-surface">
            {{ $t('pages.planner.title') }}
          </h2>

          <!-- Student pill + prev/next -->
          <div class="flex items-center gap-1.5 shrink-0">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-chevron-right"
              size="md"
              class="rounded-full w-9 h-9 justify-center disabled:opacity-30"
              :disabled="!canPrevStudent"
              :aria-label="'الطالب السابق'"
              @click="prevStudent"
            />

            <UPopover v-model:open="isStudentPopoverOpen" :ui="{ content: 'min-w-[280px] rounded-2xl' }">
              <UButton
                variant="soft"
                color="primary"
                class="rounded-full px-3 py-2 gap-2.5 hover:opacity-90"
              >
                <img
                  v-if="selectedStudentObj"
                  :src="selectedStudentObj.avatar"
                  :alt="selectedStudentObj.name"
                  class="w-7 h-7 rounded-full object-cover shrink-0"
                  referrerpolicy="no-referrer"
                >
                <LucideUser v-else class="w-4 h-4" />
                <span class="font-semibold text-sm">
                  {{ selectedStudentObj?.name || $t('common.selectStudent') }}
                </span>
                <LucideChevronDown
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': isStudentPopoverOpen }"
                />
              </UButton>

              <template #content>
                <div class="w-[280px] p-2">
                  <div class="px-2 pb-2">
                    <UInput
                      v-model="studentSearch"
                      type="text"
                      :placeholder="$t('common.searchPlaceholder')"
                      leading-icon="i-lucide-search"
                      variant="none"
                      class="w-full"
                      :ui="{
                        base: 'w-full rounded-lg px-3 py-2 bg-surface-container-low text-sm text-on-surface',
                        leadingIcon: 'w-3.5 h-3.5 text-on-surface-variant'
                      }"
                    />
                  </div>

                  <div class="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
                    <UButton
                      v-for="s in filteredDropdownStudents"
                      :key="s.id"
                      variant="ghost"
                      color="primary"
                      class="w-full gap-3 px-3 py-2 rounded-xl font-normal justify-start"
                      :class="selectedStudentObj?.id === s.id ? 'bg-primary text-white' : ''"
                      @click="pickStudent(s)"
                    >
                      <img
                        :src="s.avatar"
                        :alt="s.name"
                        class="w-8 h-8 rounded-full object-cover shrink-0"
                        referrerpolicy="no-referrer"
                      >
                      <div class="flex-1 text-start">
                        <p
                          class="text-sm font-bold leading-tight"
                          :class="selectedStudentObj?.id === s.id ? 'text-white' : 'text-on-surface'"
                        >
                          {{ s.name }}
                        </p>
                        <span
                          v-if="s.halaqa && s.halaqa !== '—'"
                          class="text-[11px]"
                          :class="selectedStudentObj?.id === s.id ? 'text-white/75' : 'text-on-surface-variant'"
                        >{{ s.halaqa }}</span>
                      </div>
                      <LucideCheck
                        v-if="selectedStudentObj?.id === s.id"
                        class="w-4 h-4 shrink-0"
                      />
                    </UButton>

                    <div v-if="filteredDropdownStudents.length === 0" class="px-3 py-4 text-center">
                      <p class="text-sm text-on-surface-variant">
                        {{ $t('common.noResults') }}
                      </p>
                    </div>
                  </div>
                </div>
              </template>
            </UPopover>

            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-chevron-left"
              size="md"
              class="rounded-full w-9 h-9 justify-center disabled:opacity-30"
              :disabled="!canNextStudent"
              :aria-label="'الطالب التالي'"
              @click="nextStudent"
            />
          </div>
        </div>

        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.planner.subtitle') }}
        </p>
      </div>

      <!-- Top action bar -->
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <UButton
          variant="outline"
          color="neutral"
          :label="$t('pages.planner.copyFromLastWeek')"
          icon="i-lucide-copy"
          size="md"
          class="font-semibold rounded-full px-4"
        />
        <UButton
          variant="outline"
          color="error"
          :label="$t('pages.planner.topActions.clearAll')"
          icon="i-lucide-eraser"
          size="md"
          class="font-semibold rounded-full px-4"
          @click="requestClearAll"
        />
        <UButton
          variant="outline"
          color="primary"
          :label="$t('pages.planner.topActions.preview')"
          icon="i-lucide-eye"
          size="md"
          class="font-semibold rounded-full px-4"
          @click="isPreviewOpen = true"
        />

        <!-- Status-aware primary action -->
        <template v-if="planStatus === 'new'">
          <UButton
            color="primary"
            :label="$t('pages.planner.saveAsDraft')"
            icon="i-lucide-save"
            size="md"
            class="font-bold rounded-full px-5"
            :loading="isSaving"
            :disabled="isSaving"
            @click="handleSaveAsDraft"
          />
        </template>

        <template v-else-if="planStatus === 'draft' && !isEditMode">
          <UButton
            variant="outline"
            color="neutral"
            :label="$t('pages.planner.editPlan')"
            icon="i-lucide-pencil"
            size="md"
            class="font-semibold rounded-full px-4"
            @click="startEditing"
          />
          <UButton
            color="primary"
            :label="$t('pages.planner.approvePlan')"
            icon="i-lucide-check-circle"
            size="md"
            class="font-bold rounded-full px-5"
            :loading="isSaving"
            :disabled="isSaving"
            @click="handleApprovePlan"
          />
        </template>

        <template v-else-if="planStatus === 'draft' && isEditMode">
          <UButton
            variant="ghost"
            color="neutral"
            :label="$t('common.cancel')"
            icon="i-lucide-x"
            size="md"
            class="font-semibold rounded-full px-4"
            :disabled="isSaving"
            @click="cancelEditing"
          />
          <UButton
            color="primary"
            :label="$t('pages.planner.saveAsDraft')"
            icon="i-lucide-save"
            size="md"
            class="font-bold rounded-full px-5"
            :loading="isSaving"
            :disabled="isSaving"
            @click="handleSaveAsDraft"
          />
        </template>

        <template v-else-if="planStatus === 'approved' && !isEditMode">
          <div class="flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-sm bg-status-ok-bg border-status-ok/40 text-status-ok">
            <LucideCheckCircle class="w-4 h-4" />
            {{ $t('pages.planner.approved') }}
          </div>
          <UButton
            variant="outline"
            color="neutral"
            :label="$t('pages.planner.editPlan')"
            icon="i-lucide-pencil"
            size="md"
            class="font-semibold rounded-full px-4"
            @click="startEditing"
          />
        </template>

        <template v-else-if="planStatus === 'approved' && isEditMode">
          <UButton
            variant="ghost"
            color="neutral"
            :label="$t('common.cancel')"
            icon="i-lucide-x"
            size="md"
            class="font-semibold rounded-full px-4"
            :disabled="isSaving"
            @click="cancelEditing"
          />
          <UButton
            color="primary"
            :label="$t('pages.planner.saveChanges')"
            icon="i-lucide-save"
            size="md"
            class="font-bold rounded-full px-5"
            :loading="isSaving"
            :disabled="isSaving"
            @click="handleSaveAsDraft"
          />
        </template>
      </div>
    </div>

    <!-- Week list -->
    <div class="mb-6">
      <PlannerWeekList />
    </div>

    <!-- Weekly summary -->
    <div class="mb-4">
      <PlannerSummaryBar />
    </div>

    <!-- Grid -->
    <div class="overflow-x-auto -mx-2 px-2 pb-2">
      <div class="min-w-[760px] flex flex-col gap-4">
        <!-- Column headers -->
        <div class="flex items-stretch gap-4 px-4">
          <div class="w-[150px] shrink-0" />
          <div class="flex-1 flex gap-6">
            <div
              v-for="col in columns"
              :key="col.key"
              class="flex-[4] flex flex-col gap-2 rounded-t-xl border-t-4 px-3 py-2"
              :class="[col.bgClass, {
                'border-track-hifz': col.key === 'mem',
                'border-track-near': col.key === 'near',
                'border-track-far': col.key === 'far'
              }]"
            >
              <div class="flex items-center justify-center gap-2">
                <UIcon :name="col.icon" class="w-4 h-4" :class="col.textClass" />
                <span class="text-sm font-bold" :class="col.textClass">
                  {{ $t(col.label) }}
                </span>
              </div>
              <UButton
                v-if="isEditMode"
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-arrow-down-up"
                class="rounded-full mx-auto px-2"
                :class="col.textClass + ' hover:bg-white/50'"
                @click="requestApplyColumn(col.key)"
              >
                <span class="text-[11px]">{{ $t('pages.planner.columns.applyToAllDays') }}</span>
              </UButton>
            </div>
          </div>
        </div>

        <!-- Day rows -->
        <div class="flex flex-col gap-3">
          <PlannerDayRow
            v-for="(day, idx) in scheduleWithDates"
            :key="day.id"
            :data="day"
            :week-start="selectedWeekStart"
            :day-index="idx"
            @request-copy-day="requestCopyDay"
          />
        </div>
      </div>
    </div>

    <!-- Preview modal -->
    <PlannerPreviewModal v-model:open="isPreviewOpen" />

    <!-- Confirmations -->
    <CommonConfirmDialog
      v-model:open="isClearConfirmOpen"
      :title="$t('pages.planner.topActions.clearConfirmTitle')"
      :message="$t('pages.planner.topActions.clearConfirmMessage')"
      :confirm-label="$t('pages.planner.topActions.clearAll')"
      destructive
      @confirm="doClearAll"
    />

    <CommonConfirmDialog
      v-model:open="isCopyDayConfirmOpen"
      :title="$t('pages.planner.row.copyConfirmTitle')"
      :message="$t('pages.planner.row.copyConfirmMessage')"
      @confirm="doCopyDay"
    />

    <CommonConfirmDialog
      v-model:open="isApplyColumnConfirmOpen"
      :title="$t('pages.planner.columns.applyConfirmTitle')"
      :message="$t('pages.planner.columns.applyConfirmMessage')"
      @confirm="doApplyColumn"
    />
  </div>
</template>
