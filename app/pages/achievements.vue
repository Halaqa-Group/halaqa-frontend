<script setup lang="ts">
import type { CreateAchievementDto, StudentWithAttendance } from '~/types'

definePageMeta({ layout: 'dashboard' })

const { t } = useI18n()
const {
  students, selectedStudent, achievements, selectedDate,
  isLoading, hasStudents, achievementsCount,
  loadStudents, selectStudent, addAchievement, deleteAchievement, reset
} = useAchievements()

const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const toast = useToast()

const isStudentDropdownOpen = ref(false)
const studentCardRef = ref<HTMLElement | null>(null)
const triggerButtonRef = ref<HTMLButtonElement | null>(null)
const teleportedDropdownRef = ref<HTMLElement | null>(null)
const studentSearch = ref('')
const dropdownPos = ref({ top: 0, left: 0, width: 0 })

const filteredDropdownStudents = computed(() =>
  studentSearch.value.trim()
    ? students.value.filter(s => s.name.includes(studentSearch.value.trim()))
    : students.value
)

const filteredAchievements = computed(() =>
  achievements.value.filter(a =>
    a.student_id === selectedStudent.value?.id &&
    a.date === selectedDate.value
  )
)

function openDropdown() {
  if (triggerButtonRef.value) {
    const rect = triggerButtonRef.value.getBoundingClientRect()
    dropdownPos.value = { top: rect.bottom + 8, left: rect.left, width: rect.width }
  }
  isStudentDropdownOpen.value = !isStudentDropdownOpen.value
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  const inCard = studentCardRef.value?.contains(target)
  const inDropdown = teleportedDropdownRef.value?.contains(target)
  if (!inCard && !inDropdown) {
    isStudentDropdownOpen.value = false
    studentSearch.value = ''
  }
}

async function onDateChange() {
  if (selectedHalaqaId.value && selectedDate.value) {
    reset()
    await loadStudents(selectedHalaqaId.value, selectedDate.value)
  }
}

watch(selectedHalaqaId, async (newId, oldId) => {
  if (newId && newId !== oldId && selectedDate.value) {
    reset()
    await loadStudents(newId, selectedDate.value)
  }
})

async function handleAchievementSubmit(data: CreateAchievementDto) {
  try {
    await addAchievement(data)
    toast.add({ title: t('pages.achievements.savedToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('pages.achievements.saveErrorTitle'), description: error.data?.message || error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleAchievementDelete(id: number) {
  try {
    await deleteAchievement(id)
    toast.add({ title: t('pages.achievements.deletedToast'), icon: 'i-lucide-check-circle', color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('pages.achievements.deleteErrorTitle'), description: error.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

function handleStudentSelect(student: StudentWithAttendance) {
  if (selectedHalaqaId.value) {
    selectStudent(student, selectedHalaqaId.value)
    isStudentDropdownOpen.value = false
    studentSearch.value = ''
  }
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadStudents(selectedHalaqaId.value, selectedDate.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          {{ $t('pages.achievements.recordLabel') }}
        </span>
        <h2 class="display-lg" style="color: var(--color-on-surface);">{{ $t('pages.achievements.title') }}</h2>
        <p class="text-sm" style="color: var(--color-on-surface-variant);">
          {{ $t('pages.achievements.subtitle') }}
        </p>
      </div>
      <div
        v-if="hasHalaqa && hasStudents"
        class="flex items-center gap-3 px-5 py-3 rounded-[40px] shrink-0"
        style="background-color: var(--color-track-hifz-bg);"
      >
        <UIcon name="i-lucide-award" class="w-6 h-6" style="color: var(--color-track-hifz);" />
        <span class="body-lg font-bold" style="color: var(--color-track-hifz);">{{ $t('pages.achievements.todayCount', { count: filteredAchievements.length }) }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin" style="color: var(--color-primary);" />
    </div>

    <!-- Empty: no halaqa -->
    <div
      v-else-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-[40px]"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
      <p class="body-md" style="color: var(--color-on-surface-variant);">
        {{ $t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <!-- Two-column layout: sidebar (right in RTL) + main content -->
      <div class="flex gap-14 items-start w-full">

        <!-- RIGHT sidebar -->
        <div class="w-[320px] shrink-0 flex flex-col gap-8 mt-8 relative z-20">

          <!-- Student selector card (planner style) -->
          <div
            ref="studentCardRef"
            class="relative p-5 rounded-[40px] flex flex-col gap-4 shadow-2xl border border-white/10 hover:scale-[1.01] transition-all"
            style="background-color: var(--color-primary); box-shadow: 0 20px 60px rgba(128,76,125,0.3);"
          >
            <!-- Gradient overlays -->
            <div class="absolute inset-0 rounded-[40px] overflow-hidden pointer-events-none">
              <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-50" />
              <div class="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            </div>

            <!-- Header -->
            <div class="relative z-10 flex items-center justify-center">
              <p class="text-sm font-semibold" style="color: white;">{{ $t('common.selectStudent') }}</p>
            </div>

            <!-- Dropdown trigger -->
            <div class="relative">
              <UButton
                ref="triggerButtonRef"
                variant="ghost"
                color="neutral"
                class="w-full backdrop-blur-md border border-white/20 rounded-[24px] p-2 gap-3 group shadow-xl"
                style="background-color: rgba(255,255,255,0.1);"
                @click="openDropdown"
              >
                <div class="w-11 h-11 rounded-[18px] overflow-hidden border-2 border-white/40 shadow-inner shrink-0 group-hover:rotate-1 transition-transform">
                  <img
                    :src="selectedStudent?.avatar ?? `https://api.dicebear.com/9.x/notionists/svg?seed=default`"
                    :alt="selectedStudent?.name ?? ''"
                    class="w-full h-full object-cover"
                  >
                </div>
                <div class="flex-1 text-right">
                  <h3 class="font-bold text-base tracking-tight leading-tight" style="color: white;">
                    {{ selectedStudent?.name || $t('common.selectStudent') }}
                  </h3>
                </div>
                <div class="ps-3 transition-colors" style="color: rgba(255,255,255,0.4);">
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="w-4 h-4 transition-transform duration-300"
                    :class="{ 'rotate-180': isStudentDropdownOpen }"
                  />
                </div>
              </UButton>

            </div>
          </div>

          <!-- Dropdown teleported to body to escape overflow-y:auto on <main> -->
          <Teleport to="body">
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-2"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-2"
            >
              <div
                v-if="isStudentDropdownOpen"
                ref="teleportedDropdownRef"
                class="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden"
                :style="{
                  position: 'fixed',
                  top: dropdownPos.top + 'px',
                  left: dropdownPos.left + 'px',
                  width: dropdownPos.width + 'px',
                  zIndex: 9999,
                  direction: 'rtl'
                }"
              >
                <!-- Search -->
                <div class="px-3 pt-3 pb-2">
                  <div class="flex items-center gap-2 rounded-[14px] px-3 py-2" style="background-color: rgba(0,0,0,0.05);">
                    <UIcon name="i-lucide-search" class="w-3.5 h-3.5 shrink-0" style="color: var(--color-on-surface-variant);" />
                    <input
                      v-model="studentSearch"
                      type="text"
                      :placeholder="$t('common.searchPlaceholder')"
                      class="flex-1 bg-transparent text-sm outline-none text-right"
                      style="color: var(--color-on-surface);"
                      dir="rtl"
                    >
                  </div>
                </div>

                <!-- Student list -->
                <div class="px-2 pb-2 flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
                  <UButton
                    v-for="student in filteredDropdownStudents"
                    :key="student.id"
                    variant="ghost"
                    color="primary"
                    class="w-full gap-3 px-3 py-2.5 rounded-[18px] font-normal"
                    :style="selectedStudent?.id === student.id ? 'background-color: var(--color-primary);' : ''"
                    :class="selectedStudent?.id !== student.id ? 'hover:bg-primary/5' : ''"
                    @click="handleStudentSelect(student)"
                  >
                    <div
                      class="w-10 h-10 rounded-[14px] overflow-hidden border-2 shrink-0"
                      :style="selectedStudent?.id === student.id ? 'border-color: rgba(255,255,255,0.3);' : 'border-color: rgba(128,76,125,0.15);'"
                    >
                      <img :src="student.avatar" :alt="student.name" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 text-right">
                      <p
                        class="font-bold text-sm leading-tight"
                        :style="selectedStudent?.id === student.id ? 'color: white;' : 'color: var(--color-on-surface);'"
                      >{{ student.name }}</p>
                      <span
                        v-if="student.attendanceStatus"
                        class="text-[11px]"
                        :style="selectedStudent?.id === student.id
                          ? 'color: rgba(255,255,255,0.6);'
                          : student.attendanceStatus === 'Present' ? 'color: var(--color-track-hifz);'
                          : student.attendanceStatus === 'Late' ? 'color: var(--color-track-far);'
                          : student.attendanceStatus === 'Absent' ? 'color: var(--color-track-near);'
                          : 'color: var(--color-on-surface-variant);'"
                      >{{ $t(`attendance.status.${(student.attendanceStatus || 'excused').toLowerCase()}`) }}</span>
                    </div>
                    <UIcon
                      v-if="selectedStudent?.id === student.id"
                      name="i-lucide-check"
                      class="w-4 h-4 shrink-0"
                      style="color: rgba(255,255,255,0.7);"
                    />
                    <span v-else class="w-4 shrink-0" />
                  </UButton>

                  <div v-if="filteredDropdownStudents.length === 0" class="px-3 py-4 text-center">
                    <p class="text-sm" style="color: var(--color-on-surface-variant);">{{ $t('common.noResults') }}</p>
                  </div>
                </div>
              </div>
            </Transition>
          </Teleport>

          <!-- Calendar -->
          <AttendanceCalendar
            v-model="selectedDate"
            @update:model-value="onDateChange"
          />
        </div>

        <!-- Col 2: Achievement form -->
        <div class="flex-1 min-w-0 mt-8">
          <div
            v-if="!selectedStudent"
            class="rounded-[40px] p-16 flex flex-col items-center gap-4"
            style="background-color: var(--color-surface-container-lowest);"
          >
            <UIcon name="i-lucide-user-check" class="w-14 h-14" style="color: var(--color-on-surface-variant);" />
            <p class="body-lg text-center" style="color: var(--color-on-surface-variant);">
              {{ $t('pages.achievements.selectStudentToLog') }}
            </p>
          </div>
          <AchievementForm
            v-else-if="selectedHalaqaId && selectedDate"
            :student="selectedStudent"
            :halaqa-id="selectedHalaqaId"
            :date="selectedDate"
            @submit="handleAchievementSubmit"
          />
        </div>

        <!-- Col 3: Achievements list (filtered by selected student + selected date) -->
        <div class="shrink-0 w-[400px] mt-8 flex flex-col gap-3">
          <div class="flex items-center justify-between px-1">
            <p class="body-lg font-bold" style="color: var(--color-on-surface);">{{ $t('pages.achievements.todaysAchievements') }}</p>
            <span v-if="selectedStudent" class="label-md" style="color: var(--color-on-surface-variant);">{{ selectedStudent.name }}</span>
          </div>

          <!-- Dotted scrollable container — shows ~3 cards, scroll for more -->
          <div
            class="rounded-[40px] p-5 overflow-y-auto"
            style="
              border: 2px dashed var(--color-outline-variant);
              background-color: transparent;
              max-height: 700px;
              scrollbar-width: thin;
              scrollbar-color: rgba(128,76,125,0.2) transparent;
            "
          >
            <AchievementList
              :achievements="filteredAchievements"
              @delete="handleAchievementDelete"
            />
          </div>
        </div>

      </div>
    </template>
  </div>
</template>
