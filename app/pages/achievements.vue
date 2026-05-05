<script setup lang="ts">
import type { ApiAchievement, CreateAchievementDto, StudentWithAttendance } from '~/types'

const {
  students, selectedStudent, achievements, selectedDate,
  isLoading, hasStudents,
  loadStudents, selectStudent, addAchievement, updateAchievement, deleteAchievement, reset
} = useAchievements()

const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const toast = useToast()

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
  toast.add({ title: 'تم نسخ بيانات الإنجاز إلى النموذج', icon: 'i-lucide-copy', color: 'primary' })
}

function handleCancelEdit() {
  editingAchievement.value = null
}

async function handleAchievementSubmit(data: CreateAchievementDto) {
  try {
    await addAchievement(data)
    toast.add({ title: 'تم حفظ الإنجاز بنجاح ✓', icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'خطأ في حفظ الإنجاز', description: error.data?.message || error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleAchievementUpdate(id: number, data: CreateAchievementDto) {
  try {
    await updateAchievement(id, data)
    editingAchievement.value = null
    toast.add({ title: 'تم تحديث الإنجاز بنجاح ✓', icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'خطأ في تحديث الإنجاز', description: error.data?.message || error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleAchievementDelete(id: number) {
  try {
    if (editingAchievement.value?.id === id) editingAchievement.value = null
    await deleteAchievement(id)
    toast.add({ title: 'تم حذف الإنجاز', icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'خطأ في حذف الإنجاز', description: error.message, icon: 'i-lucide-alert-circle', color: 'error' })
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
  <div class="flex flex-col gap-6">
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest text-primary">
          {{ $t('pages.achievements.recordLabel') }}
        </span>
        <h2 class="text-3xl font-bold leading-tight text-on-surface">
          {{ $t('pages.achievements.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.achievements.subtitle') }}
        </p>
      </div>

      <AchievementStudentSelector
        v-if="hasHalaqa && hasStudents"
        :students="students"
        :selected-student="selectedStudent"
        @select="handleStudentSelect" />
    </div>

    <!-- Mini stats row -->
    <AchievementStatsRow
      v-if="hasHalaqa && selectedStudent"
      :achievements="filteredAchievements" />

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Empty: no halaqa -->
    <div
      v-else-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl bg-surface-container-lowest">
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-on-surface-variant" />
      <p class="text-sm font-normal leading-relaxed text-on-surface-variant">
        {{ $t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <!-- 3-column layout: calendar+streak | form | list -->
      <div class="flex gap-6 items-start w-full">
        <!-- Sidebar: streak + calendar -->
        <div class="w-[300px] shrink-0">
          <AchievementCalendar
            v-model="selectedDate"
            @update:model-value="onDateChange" />
        </div>

        <!-- Center: picker or form -->
        <div class="flex-1 min-w-0">
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

        <!-- Right: achievements list -->
        <div v-if="selectedStudent" class="shrink-0 w-[380px] flex flex-col gap-3">
          <div class="flex items-center justify-between px-1">
            <p class="text-base font-bold leading-relaxed text-on-surface">
              {{ $t('pages.achievements.todaysAchievements') }}
            </p>
            <span class="text-xs font-semibold leading-tight tracking-wide text-on-surface-variant">{{ selectedStudent.name }}</span>
          </div>

          <div
            class="rounded-2xl p-4 overflow-y-auto border-2 border-dashed border-outline-variant bg-transparent max-h-[720px]"
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
