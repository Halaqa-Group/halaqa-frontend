<script setup lang="ts">
import type { ApiAchievement, CreateAchievementDto, StudentWithAttendance } from '~/types'

const { t, locale } = useI18n()
const {
  students, selectedStudent, achievements, selectedDate,
  isLoading, hasStudents,
  loadStudents, selectStudent, addAchievement, updateAchievement, deleteAchievement, reset
} = useAchievements()

// Collapsible date strip on <xl
const isDateOpen = ref(false)

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  if (!y || !m || !d) return selectedDate.value
  try {
    return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : locale.value, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  } catch {
    return selectedDate.value
  }
})

const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const toast = useToast()

// Built lazily so it picks up live changes to student/halaqa/date.
const reciteLink = computed(() => {
  if (!selectedStudent.value || !selectedHalaqaId.value) return null
  return {
    path: '/recite',
    query: {
      student_id: selectedStudent.value.id,
      halaqa_id: selectedHalaqaId.value,
      date: selectedDate.value
    }
  }
})

const filteredAchievements = computed(() =>
  achievements.value.filter(a =>
    a.student_id === selectedStudent.value?.id
    && a.date === selectedDate.value
  )
)

function handleStudentSelect(student: StudentWithAttendance) {
  if (selectedHalaqaId.value) {
    selectStudent(student, selectedHalaqaId.value)
  }
}

async function onDateChange() {
  if (selectedHalaqaId.value && selectedDate.value) {
    reset()
    await loadStudents(selectedHalaqaId.value, selectedDate.value)
  }
}

// ── Edit / duplicate state ────────────────────────────────────────────────
const editingAchievement = ref<ApiAchievement | null>(null)
const duplicateFrom = ref<ApiAchievement | null>(null)

function handleEditAchievement(a: ApiAchievement) {
  duplicateFrom.value = null
  editingAchievement.value = a
}

function handleDuplicateAchievement(a: ApiAchievement) {
  editingAchievement.value = null
  // Trigger watcher even if same object reference
  duplicateFrom.value = null
  nextTick(() => {
    duplicateFrom.value = { ...a }
  })
  toast.add({ title: t('pages.achievements.duplicatedToast'), icon: 'i-lucide-copy', color: 'primary' })
}

function handleCancelEdit() {
  editingAchievement.value = null
}

async function handleAchievementSubmit(data: CreateAchievementDto) {
  try {
    await addAchievement(data)
    toast.add({ title: t('pages.achievements.savedToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('pages.achievements.saveErrorTitle'), description: error.data?.message || error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleAchievementUpdate(id: number, data: CreateAchievementDto) {
  try {
    await updateAchievement(id, data)
    editingAchievement.value = null
    toast.add({ title: t('pages.achievements.updatedToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('pages.achievements.updateErrorTitle'), description: error.data?.message || error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleAchievementDelete(id: number) {
  try {
    if (editingAchievement.value?.id === id) editingAchievement.value = null
    await deleteAchievement(id)
    toast.add({ title: t('pages.achievements.deletedToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('pages.achievements.deleteErrorTitle'), description: error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

watch(selectedHalaqaId, async (newId, oldId) => {
  if (newId && newId !== oldId && selectedDate.value) {
    reset()
    await loadStudents(newId, selectedDate.value)
  }
})

onMounted(async () => {
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadStudents(selectedHalaqaId.value, selectedDate.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 pb-24">
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-2">
      <div class="space-y-1 min-w-0">
        <span class="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-primary">
          {{ $t('pages.achievements.recordLabel') }}
        </span>
        <h2 class="text-2xl sm:text-3xl font-bold leading-tight text-on-surface">
          {{ $t('pages.achievements.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.achievements.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap md:justify-end md:shrink-0 w-full md:w-auto min-w-0">
        <UButton
          v-if="reciteLink"
          :to="reciteLink"
          :label="$t('pages.achievements.reciteInMushaf')"
          icon="i-lucide-book-open"
          color="primary"
          variant="soft"
          size="md"
          class="rounded-full font-semibold shrink-0"
        />
        <AchievementStudentSelector
          v-if="hasHalaqa && hasStudents"
          class="flex-1 md:flex-initial min-w-0"
          :students="students"
          :selected-student="selectedStudent"
          @select="handleStudentSelect" />
      </div>
    </div>

    <!-- Mini stats row -->
    <AchievementStatsRow
      v-if="hasHalaqa && selectedStudent"
      :achievements="filteredAchievements" />

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <LucideLoaderCircle class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Empty: no halaqa -->
    <div
      v-else-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl ring ring-card-border bg-surface-container-lowest">
      <LucideLayers class="w-10 h-10 text-on-surface-variant" />
      <p class="text-sm font-normal leading-relaxed text-on-surface-variant">
        {{ $t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <!-- Compact date trigger for <xl (calendar lives full-width inside the grid on xl) -->
      <div class="xl:hidden">
        <button
          type="button"
          class="w-full flex items-center gap-3 rounded-2xl px-4 py-3 ring ring-card-border bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
          :aria-expanded="isDateOpen"
          @click="isDateOpen = !isDateOpen"
        >
          <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary-container">
            <LucideCalendar class="w-4 h-4 text-primary" />
          </span>
          <span class="flex-1 min-w-0 text-start">
            <span class="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {{ $t('pages.achievements.changeDate') }}
            </span>
            <span class="block text-sm font-bold truncate text-on-surface">
              {{ formattedSelectedDate }}
            </span>
          </span>
          <LucideChevronDown
            class="w-4 h-4 shrink-0 text-on-surface-variant transition-transform"
            :class="{ 'rotate-180': isDateOpen }"
          />
        </button>
        <div v-if="isDateOpen" class="mt-3">
          <AchievementCalendar
            v-model="selectedDate"
            @update:model-value="() => { onDateChange(); isDateOpen = false }" />
        </div>
      </div>

      <!-- Responsive grid: 1 col on <lg, 2 cols on lg, 3 cols on xl -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[300px_minmax(0,1fr)_380px] gap-4 sm:gap-6 items-start w-full">
        <!-- Sidebar: calendar (xl only) -->
        <div class="hidden xl:block min-w-0">
          <AchievementCalendar
            v-model="selectedDate"
            @update:model-value="onDateChange" />
        </div>

        <!-- Center: picker or form -->
        <div class="min-w-0">
          <AchievementStudentPicker
            v-if="!selectedStudent"
            :students="students"
            @select="handleStudentSelect" />
          <AchievementForm
            v-else-if="selectedHalaqaId && selectedDate"
            :student="selectedStudent"
            :halaqa-id="selectedHalaqaId"
            :date="selectedDate"
            :editing-achievement="editingAchievement"
            :duplicate-from="duplicateFrom"
            @submit="handleAchievementSubmit"
            @update="handleAchievementUpdate"
            @cancel-edit="handleCancelEdit" />
        </div>

        <!-- Right: achievements list (full-flow on mobile, scroll-capped on lg+) -->
        <div v-if="selectedStudent" class="min-w-0 rounded-2xl ring ring-card-border bg-surface-container-lowest shadow-card overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3 border-b border-outline-variant">
            <p class="text-base font-bold leading-relaxed text-on-surface">
              {{ $t('pages.achievements.todaysAchievements') }}
            </p>
            <span class="text-xs font-semibold leading-tight tracking-wide text-on-surface-variant truncate">
              {{ selectedStudent.name }}
            </span>
          </div>

          <div
            class="p-3 sm:p-4 lg:overflow-y-auto lg:max-h-[720px]"
            style="scrollbar-width: thin;">
            <AchievementList
              :achievements="filteredAchievements"
              :editing-id="editingAchievement?.id ?? null"
              @delete="handleAchievementDelete"
              @edit="handleEditAchievement"
              @duplicate="handleDuplicateAchievement" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
