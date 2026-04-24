<script setup lang="ts">
import type { CreateAchievementDto, StudentWithAttendance } from '~/types'

definePageMeta({ layout: 'dashboard' })

const {
  students,
  selectedStudent,
  achievements,
  selectedDate,
  isLoading,
  isSaving,
  hasStudents,
  achievementsCount,
  loadStudents,
  selectStudent,
  addAchievement,
  deleteAchievement,
  reset
} = useAchievements()

const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const { user } = useAuth()
const toast = useToast()

const searchQuery = ref('')

// Filter students by search query
const filteredStudents = computed(() =>
  students.value.filter(s =>
    !searchQuery.value || s.name.includes(searchQuery.value)
  )
)

// Handle date change
async function onDateChange() {
  if (selectedHalaqaId.value && selectedDate.value) {
    reset()
    await loadStudents(selectedHalaqaId.value, selectedDate.value)
  }
}

// Watch for halaqa changes from global selector
watch(selectedHalaqaId, async (newHalaqaId, oldHalaqaId) => {
  // Only load if halaqaId changed and is valid (not initial null)
  if (newHalaqaId && newHalaqaId !== oldHalaqaId && selectedDate.value) {
    reset()
    await loadStudents(newHalaqaId, selectedDate.value)
  }
})

// Handle achievement submission
async function handleAchievementSubmit(data: CreateAchievementDto) {
  try {
    await addAchievement(data)
    toast.add({
      title: 'تم حفظ الإنجاز بنجاح',
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'خطأ في حفظ الإنجاز',
      description: error.data?.message || error.message || 'حدث خطأ غير متوقع',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

// Handle achievement deletion
async function handleAchievementDelete(id: number) {
  try {
    await deleteAchievement(id)
    toast.add({
      title: 'تم حذف الإنجاز',
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'خطأ في حذف الإنجاز',
      description: error.message || 'حدث خطأ غير متوقع',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

// Handle student selection
function handleStudentSelect(student: StudentWithAttendance) {
  if (selectedHalaqaId.value) {
    selectStudent(student, selectedHalaqaId.value)
  }
}

// Initialize
onMounted(async () => {
  // Load students for currently selected global halaqa
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadStudents(selectedHalaqaId.value, selectedDate.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Session controls -->
    <div class="flex flex-wrap items-center gap-3">
<!-- Date picker -->
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-xl"
        style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
      >
        <UIcon name="i-lucide-calendar" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
        <input
          v-model="selectedDate"
          type="date"
          dir="ltr"
          class="bg-transparent text-sm font-arabic outline-none"
          style="color: var(--color-on-surface);"
          @change="onDateChange"
        >
      </div>

      <!-- Stats -->
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-xl ms-auto"
        style="background-color: #E0F0EE;"
      >
        <UIcon name="i-lucide-award" class="w-4 h-4" style="color: #4A8E85;" />
        <span class="label-md font-arabic font-semibold" style="color: #4A8E85;">
          {{ achievementsCount }} إنجاز اليوم
        </span>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin" style="color: var(--color-primary);" />
    </div>

    <!-- Empty state (no halaqa selected) -->
    <div
      v-else-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
      <p class="body-md font-arabic" style="color: var(--color-on-surface-variant);">
        استخدم أيقونة الحلقات في الشريط الجانبي لاختيار حلقة
      </p>
    </div>

    <!-- Empty state (no students present) -->
    <div
      v-else-if="!hasStudents"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-user-x" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
      <p class="body-md font-arabic text-center" style="color: var(--color-on-surface-variant);">
        لا يوجد طلاب حاضرون اليوم
      </p>
      <p class="body-sm font-arabic text-center" style="color: var(--color-on-surface-variant);">
        تأكد من تسجيل الحضور أولاً
      </p>
      <NuxtLink
        to="/attendance"
        class="mt-2 px-4 py-2 rounded-xl text-sm font-arabic font-semibold transition-colors no-underline"
        style="background-color: var(--color-primary); color: white;"
      >
        الانتقال إلى صفحة الحضور
      </NuxtLink>
    </div>

    <!-- Main 3-column layout -->
    <template v-else>
      <div class="grid grid-cols-[300px_1fr_380px] gap-6">
        <!-- Left column: Student list -->
        <div class="flex flex-col gap-3">
          <!-- Search -->
          <div class="relative">
            <UIcon name="i-lucide-search" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style="color: var(--color-on-surface-variant);" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="بحث عن طالب..."
              class="w-full pr-9 pl-4 py-2.5 rounded-xl text-sm font-arabic outline-none"
              style="background-color: var(--color-surface-container-lowest); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);"
            >
          </div>

          <!-- Student cards -->
          <div class="flex flex-col gap-2">
            <AchievementStudentCard
              v-for="student in filteredStudents"
              :key="student.id"
              :student="student"
              :selected="selectedStudent?.id === student.id"
              @select="handleStudentSelect"
            />

            <!-- Empty state -->
            <div
              v-if="filteredStudents.length === 0"
              class="rounded-2xl p-6 text-center"
              style="background-color: var(--color-surface-container-lowest);"
            >
              <p class="body-sm font-arabic" style="color: var(--color-on-surface-variant);">
                لا توجد نتائج
              </p>
            </div>
          </div>
        </div>

        <!-- Center column: Achievement form -->
        <div>
          <!-- Placeholder when no student selected -->
          <div
            v-if="!selectedStudent"
            class="rounded-2xl p-12 flex flex-col items-center gap-3"
            style="background-color: var(--color-surface-container-lowest);"
          >
            <UIcon name="i-lucide-user-check" class="w-12 h-12" style="color: var(--color-on-surface-variant);" />
            <p class="body-md font-arabic text-center" style="color: var(--color-on-surface-variant);">
              اختر طالباً من القائمة لتسجيل إنجاز
            </p>
          </div>

          <!-- Achievement form -->
          <AchievementForm
            v-else-if="selectedHalaqaId && selectedDate"
            :student="selectedStudent"
            :halaqa-id="selectedHalaqaId"
            :date="selectedDate"
            @submit="handleAchievementSubmit"
          />
        </div>

        <!-- Right column: Achievements list -->
        <div>
          <div class="rounded-2xl p-4 mb-4" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);">
            <p class="title-md font-arabic font-semibold mb-1" style="color: var(--color-on-surface);">
              إنجازات اليوم
            </p>
            <p v-if="selectedStudent" class="label-sm font-arabic" style="color: var(--color-on-surface-variant);">
              {{ selectedStudent.name }}
            </p>
          </div>

          <AchievementList
            :achievements="achievements"
            @delete="handleAchievementDelete"
          />
        </div>
      </div>
    </template>
  </div>
</template>
