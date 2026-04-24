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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="مخطط الأسبوع">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="!isEditMode"
              variant="outline"
              color="neutral"
              label="نسخ من الأسبوع الماضي"
              size="sm"
              class="font-arabic"
            />
            <UButton
              :icon="isEditMode ? 'i-lucide-check' : 'i-lucide-save'"
              :label="isEditMode ? 'حفظ المخطط' : 'تعديل الخطة'"
              color="primary"
              :variant="isEditMode ? 'outline' : 'solid'"
              size="sm"
              class="font-arabic"
              @click="toggleEdit"
            />
          </div>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-col gap-0.5">
            <p class="text-xs text-muted font-arabic">دورة التخطيط السنوية</p>
            <p class="text-sm font-bold text-highlighted font-arabic">٢٣ أكتوبر — ٢٩ أكتوبر، ٢٠٢٣</p>
          </div>
        </template>
        <template #right>
          <UDropdownMenu :items="studentMenuItems">
            <div class="flex items-center gap-2.5 ps-2 pe-3 py-2 bg-white dark:bg-elevated border border-default rounded-2xl cursor-pointer hover:bg-muted/30 transition-colors select-none min-w-[180px]">
              <UAvatar :src="selectedStudentAvatar" size="sm" />
              <div class="flex flex-col flex-1 items-start">
                <span class="text-[10px] text-muted font-arabic leading-none mb-0.5">الطالب المختار</span>
                <span class="text-sm font-bold text-highlighted font-arabic leading-tight">{{ selectedStudent }}</span>
              </div>
              <UIcon name="i-lucide-chevron-down" class="size-3.5 text-muted flex-shrink-0" />
            </div>
          </UDropdownMenu>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 p-4">
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
    </template>
  </UDashboardPanel>
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
