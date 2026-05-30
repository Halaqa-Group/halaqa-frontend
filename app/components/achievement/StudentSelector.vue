<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { StudentWithAttendance } from '~/types'

const props = defineProps<{
  students: StudentWithAttendance[]
  selectedStudent: StudentWithAttendance | null
}>()

const emit = defineEmits<{
  select: [student: StudentWithAttendance]
}>()

const isOpen = ref(false)
const search = ref('')

const filtered = computed(() =>
  search.value.trim()
    ? props.students.filter(s => s.name.includes(search.value.trim()))
    : props.students
)

const currentIndex = computed(() =>
  props.selectedStudent
    ? props.students.findIndex(s => s.id === props.selectedStudent!.id)
    : -1
)
const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(() =>
  currentIndex.value !== -1 && currentIndex.value < props.students.length - 1
)

function pick(student: StudentWithAttendance) {
  emit('select', student)
  isOpen.value = false
  search.value = ''
}

function goPrev() {
  if (!canPrev.value) return
  const prev = props.students[currentIndex.value - 1]
  if (prev) emit('select', prev)
}

function goNext() {
  if (!canNext.value) return
  const next = props.students[currentIndex.value + 1]
  if (next) emit('select', next)
}

watch(() => props.selectedStudent, () => {
  isOpen.value = false
})
</script>

<template>
  <div class="flex items-center gap-1.5 min-w-0 w-full sm:w-auto">
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-chevron-right"
      size="md"
      class="hidden sm:flex rounded-full w-9 h-9 justify-center disabled:opacity-30 shrink-0"
      :disabled="!canPrev"
      :aria-label="'الطالب السابق'"
      @click="goPrev"
    />

    <UPopover v-model:open="isOpen" :ui="{ content: 'min-w-[260px]' }" class="flex-1 sm:flex-initial min-w-0">
      <UButton
        variant="soft"
        color="primary"
        class="w-full sm:w-auto rounded-full px-3 py-2 gap-2.5 hover:opacity-90 min-w-0"
      >
        <img
          v-if="selectedStudent"
          :src="selectedStudent.avatar"
          :alt="selectedStudent.name"
          class="w-7 h-7 rounded-full object-cover shrink-0"
        >
        <LucideUser v-else class="w-4 h-4 shrink-0" />
        <span class="font-semibold text-sm flex-1 min-w-0 truncate text-start">
          {{ selectedStudent?.name || $t('common.selectStudent') }}
        </span>
        <LucideChevronDown
          class="w-4 h-4 shrink-0 transition-transform"
          :class="{ 'rotate-180': isOpen }"
        />
      </UButton>

      <template #content>
        <div class="w-[280px] p-2">
          <div class="px-2 pb-2">
            <UInput
              v-model="search"
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
              v-for="student in filtered"
              :key="student.id"
              variant="ghost"
              color="primary"
              class="w-full gap-3 px-3 py-2 rounded-xl font-normal justify-start"
              :class="selectedStudent?.id === student.id ? 'bg-primary text-white' : ''"
              @click="pick(student)"
            >
              <img
                :src="student.avatar"
                :alt="student.name"
                class="w-8 h-8 rounded-full object-cover shrink-0"
              >
              <div class="flex-1 text-start">
                <p
                  class="text-sm font-bold leading-tight"
                  :class="selectedStudent?.id === student.id ? 'text-white' : 'text-on-surface'"
                >
                  {{ student.name }}
                </p>
                <span
                  v-if="student.attendanceStatus"
                  class="text-[11px]"
                  :class="selectedStudent?.id === student.id ? 'text-white/75' : 'text-on-surface-variant'"
                >{{ $t(`attendance.status.${student.attendanceStatus.toLowerCase()}`) }}</span>
              </div>
              <LucideCheck
                v-if="selectedStudent?.id === student.id"
                class="w-4 h-4 shrink-0"
              />
            </UButton>

            <div v-if="filtered.length === 0" class="px-3 py-4 text-center">
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
      class="hidden sm:flex rounded-full w-9 h-9 justify-center disabled:opacity-30 shrink-0"
      :disabled="!canNext"
      :aria-label="'الطالب التالي'"
      @click="goNext"
    />
  </div>
</template>
