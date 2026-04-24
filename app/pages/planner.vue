<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const {
  schedule,
  isEditMode,
  selectedCount,
  hasSelection,
  clipboard,
  selectedStudent,
  deleteSelectedRows,
  copySelectedRows,
  pasteRows,
  addDay
} = useSchedule()

const { students, fetchStudents } = useStudents()

onMounted(async () => {
  await fetchStudents()
  if (students.value[0] && !selectedStudent.value) {
    selectedStudent.value = students.value[0].name
  }
})

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

    <!-- Two-column layout: sidebar (right in RTL) + table (left in RTL) -->
    <div class="flex gap-14 items-start w-full">

      <!-- RIGHT sidebar (first child = right in RTL) -->
      <div class="w-full lg:w-[320px] shrink-0 space-y-10 mt-8">

        <!-- Student selector card -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-arabic font-semibold text-center" style="color: var(--color-on-surface-variant);">اختر طالبًا</p>
          <div
            class="relative text-white p-4 rounded-[32px] flex items-center gap-5 shadow-2xl overflow-hidden border border-white/10 group hover:scale-[1.02] transition-all"
          style="background-color: var(--color-primary); box-shadow: 0 20px 40px color-mix(in srgb, var(--color-primary) 30%, transparent);"
        >
          <!-- Gradient overlay -->
          <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none opacity-50" />
          <!-- Glow blob -->
          <div class="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />

          <!-- Icon -->
          <div class="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all shadow-inner border border-white/5">
            <UIcon name="i-lucide-users" class="w-7 h-7 text-white" />
          </div>

          <!-- Label + select -->
          <div class="flex-1 text-right relative z-10 min-w-0">
            <div class="relative">
              <select
                v-model="selectedStudent"
                class="w-full bg-transparent border-none appearance-none font-arabic font-bold text-xl text-white outline-none cursor-pointer pe-6"
              >
                <option
                  v-for="s in students"
                  :key="s.name"
                  :value="s.name"
                  class="text-on-surface bg-white"
                >
                  {{ s.name }}
                </option>
              </select>
              <div class="absolute end-0 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                <UIcon name="i-lucide-chevrons-up-down" class="w-4 h-4 text-white/60" />
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- Calendar -->
        <div class="flex flex-col gap-3 mt-6">
          <p class="text-sm font-arabic font-semibold text-center" style="color: var(--color-on-surface-variant);">اختر أسبوعًا</p>
          <PlannerCalendar />
        </div>
      </div>

      <!-- LEFT table (second child = left in RTL) -->
      <div class="flex-1 min-w-0 flex flex-col gap-4">

        <!-- Column headers -->
        <div class="flex items-center gap-4 px-4">
          <div v-if="isEditMode" class="w-8 shrink-0 flex items-center justify-center">
            <span class="text-xs text-muted font-arabic">تحديد الكل</span>
          </div>
          <div class="w-[110px] shrink-0" />
          <div class="flex-1 flex gap-6">
            <div class="flex-[4] flex justify-center">
              <span class="text-xs font-medium text-muted font-arabic">الحفظ الجديد</span>
            </div>
            <div class="flex-[4] flex justify-center">
              <span class="text-xs font-medium text-muted font-arabic">المراجعة القريبة</span>
            </div>
            <div class="flex-[4] flex justify-center">
              <span class="text-xs font-medium text-muted font-arabic">المراجعة البعيدة</span>
            </div>
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
              <UButton variant="soft" color="neutral" icon="i-lucide-copy" label="نسخ" size="sm" class="font-arabic" @click="copySelectedRows" />
              <UButton variant="soft" color="error" icon="i-lucide-trash-2" label="حذف" size="sm" class="font-arabic" @click="deleteSelectedRows" />
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
        <div class="flex flex-col gap-5">
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
