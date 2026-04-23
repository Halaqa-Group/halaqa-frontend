<script setup lang="ts">
import { STUDENTS_LIST } from '~/data/constants'

definePageMeta({ layout: 'dashboard' })

const {
  schedule,
  isEditMode,
  selectedCount,
  hasSelection,
  allSelected,
  clipboard,
  selectedStudent,
  toggleSelectAll,
  deleteSelectedRows,
  copySelectedRows,
  pasteRows,
  addDay
} = useSchedule()

const studentOptions = STUDENTS_LIST.map(s => ({ label: s.name, value: s.name }))

const selectedStudentAvatar = computed(() => {
  const idx = STUDENTS_LIST.findIndex(s => s.name === selectedStudent.value)
  const seeds = ['amira', 'zaid', 'fatima']
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seeds[idx] || 'amira'}`
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Info bar -->
    <div class="flex items-center justify-between">
      <!-- Date + cycle info (right = RTL leading) -->
      <div>
        <p class="text-xs font-arabic" style="color: var(--color-on-surface-variant);">دورة التخطيط السنوية</p>
        <p class="text-base font-bold font-arabic" style="color: var(--color-on-surface);">٢١ أكتوبر — ٢٧ أكتوبر، ٢٠٢٣</p>
      </div>

      <!-- Student selector (left = RTL trailing) -->
      <div
        class="flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer"
        style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
      >
        <img
          :src="selectedStudentAvatar"
          class="w-9 h-9 rounded-full shrink-0"
          style="background-color: #EFB0C1;"
        >
        <div class="text-start">
          <p class="text-[10px] font-arabic" style="color: var(--color-on-surface-variant);">الطالب المختار</p>
          <select
            v-model="selectedStudent"
            class="text-sm font-bold font-arabic outline-none bg-transparent block"
            style="color: var(--color-on-surface);"
          >
            <option v-for="s in studentOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <UIcon name="i-lucide-chevron-down" class="w-4 h-4 shrink-0" style="color: var(--color-on-surface-variant);" />
      </div>
    </div>

    <!-- Column headers row -->
    <div class="flex items-center gap-3">
      <!-- Day label spacer -->
      <div class="w-28 shrink-0" />
      <!-- Three column headers -->
      <div class="flex-1 text-center">
        <span class="text-xs font-arabic font-medium" style="color: var(--color-on-surface-variant);">الحفظ الجديد</span>
      </div>
      <div class="flex-1 text-center">
        <span class="text-xs font-arabic font-medium" style="color: var(--color-on-surface-variant);">المراجعة القريبة</span>
      </div>
      <div class="flex-1 text-center">
        <span class="text-xs font-arabic font-medium" style="color: var(--color-on-surface-variant);">المراجعة البعيدة</span>
      </div>
      <!-- Select-all column header -->
      <div class="w-20 shrink-0 flex items-center justify-center gap-1.5">
        <UCheckbox
          v-if="isEditMode"
          :model-value="allSelected"
          @update:model-value="toggleSelectAll"
        />
        <span class="text-xs font-arabic" style="color: var(--color-on-surface-variant);">تحديد الكل</span>
      </div>
    </div>

    <!-- Batch action bar (edit mode + selection) -->
    <Transition name="slide-down">
      <div
        v-if="isEditMode && hasSelection"
        class="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
        style="background-color: var(--color-surface-container-low);"
      >
        <span class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
          {{ selectedCount }} أيام محددة
        </span>
        <UButton variant="soft" color="neutral" icon="i-lucide-copy" label="نسخ" size="sm" @click="copySelectedRows" />
        <UButton variant="soft" color="error" icon="i-lucide-trash-2" label="حذف" size="sm" @click="deleteSelectedRows" />
        <UButton
          v-if="clipboard.length > 0"
          variant="soft"
          color="primary"
          icon="i-lucide-clipboard"
          :label="`لصق (${clipboard.length})`"
          size="sm"
          @click="pasteRows"
        />
      </div>
    </Transition>

    <!-- Day rows -->
    <div class="flex flex-col gap-3">
      <PlannerDayRow
        v-for="day in schedule"
        :key="day.id"
        :data="day"
      />
    </div>

    <!-- Add day (edit mode) -->
    <div v-if="isEditMode" class="flex gap-3">
      <button
        class="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed text-sm font-arabic transition-colors hover:bg-black/5"
        style="border-color: var(--color-outline-variant); color: var(--color-on-surface-variant);"
        @click="addDay"
      >
        <UIcon name="i-lucide-plus" class="w-4 h-4" />
        إضافة يوم
      </button>
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
