<script setup lang="ts">
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

const { students, fetchStudents, isLoading } = useStudents()

// Fetch students on mount
onMounted(async () => {
  await fetchStudents()
  // Set first student as selected if students exist and no student is selected
  const firstStudent = students.value[0]
  if (firstStudent && !selectedStudent.value) {
    selectedStudent.value = firstStudent.name
  }
})

// Student names for dropdown
const studentNames = computed(() => students.value.map(s => s.name))

// Selected student avatar
const selectedStudentAvatar = computed(() => {
  const student = students.value.find(s => s.name === selectedStudent.value)
  return student ? student.avatar : 'https://api.dicebear.com/9.x/notionists/svg?seed=default'
})

// Student menu items for dropdown
const studentMenuItems = computed(() =>
  students.value.map(s => ({
    label: s.name,
    onSelect: () => { selectedStudent.value = s.name }
  }))
)

function toggleEdit() {
  isEditMode.value = !isEditMode.value
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div class="space-y-1">
        <span class="text-xs font-arabic font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          التخطيط الأسبوعي
        </span>
        <h2 class="display-lg font-arabic" style="color: var(--color-on-surface);">مخطط الأسبوع</h2>
        <p class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
          خطط دروس الأسبوع لكل طالب وتتبع التقدم في الحفظ والمراجعة.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <UDropdownMenu :items="studentMenuItems">
          <div class="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-elevated border border-slate-300 dark:border-default rounded-xl cursor-pointer hover:border-primary/30 transition-colors select-none min-w-[240px]">
            <div class="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-default shrink-0">
              <img :src="selectedStudentAvatar" class="w-full h-full object-cover" alt="" />
            </div>
            <span class="text-sm font-bold text-highlighted font-arabic flex-1 text-start">{{ selectedStudent }}</span>
            <UIcon name="i-lucide-chevron-down" class="size-4 text-muted shrink-0" />
          </div>
        </UDropdownMenu>

        <div class="w-px h-6 bg-default shrink-0" />

        <UButton
          v-if="!isEditMode"
          variant="outline"
          color="neutral"
          label="نسخ من الأسبوع الماضي"
          size="lg"
          class="font-arabic font-bold rounded-full px-6"
        />
        <UButton
          :icon="isEditMode ? 'i-lucide-check' : 'i-lucide-save'"
          :label="isEditMode ? 'حفظ المخطط' : 'تعديل الخطة'"
          color="primary"
          :variant="isEditMode ? 'outline' : 'solid'"
          size="lg"
          class="font-arabic font-bold rounded-full px-6"
          @click="toggleEdit"
        />
      </div>
    </div>

    <div class="flex flex-col gap-4">
        <!-- Column headers -->
        <div class="flex items-center gap-3">
          <div class="w-28 shrink-0" />
          <div class="flex-1 flex justify-center">
            <span class="text-xs font-medium text-muted font-arabic">الحفظ الجديد</span>
          </div>
          <div class="flex-1 flex justify-center">
            <span class="text-xs font-medium text-muted font-arabic">المراجعة القريبة</span>
          </div>
          <div class="flex-1 flex justify-center">
            <span class="text-xs font-medium text-muted font-arabic">المراجعة البعيدة</span>
          </div>
          <div class="w-20 shrink-0 flex items-center justify-center gap-1.5">
            <UCheckbox
              v-if="isEditMode"
              :model-value="allSelected"
              @update:model-value="toggleSelectAll"
            />
            <span class="text-xs text-muted font-arabic">تحديد الكل</span>
          </div>
        </div>

        <!-- Batch action bar -->
        <Transition name="slide-down">
          <div
            v-if="isEditMode && hasSelection"
            class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-elevated border border-default"
          >
            <span class="text-sm text-muted font-arabic">{{ selectedCount }} أيام محددة</span>
            <div class="flex gap-2 ms-auto">
              <UButton
                variant="soft"
                color="neutral"
                icon="i-lucide-copy"
                label="نسخ"
                size="sm"
                class="font-arabic"
                @click="copySelectedRows"
              />
              <UButton
                variant="soft"
                color="error"
                icon="i-lucide-trash-2"
                label="حذف"
                size="sm"
                class="font-arabic"
                @click="deleteSelectedRows"
              />
              <UButton
                v-if="clipboard.length > 0"
                variant="soft"
                color="primary"
                icon="i-lucide-clipboard"
                :label="`لصق (${clipboard.length})`"
                size="sm"
                class="font-arabic"
                @click="pasteRows"
              />
            </div>
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
        <div v-if="isEditMode">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-plus"
            label="إضافة يوم"
            size="sm"
            class="font-arabic border-dashed"
            @click="addDay"
          />
        </div>
    </div>
  </div>
</template>


<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
