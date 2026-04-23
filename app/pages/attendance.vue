<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { attendanceRows, sessionNotes, appendNote } = useAttendance()

const quickTags = ['تفاعل ممتاز', 'مراجعة جماعية', 'تم الانتهاء من جزء']
const searchQuery = ref('')

const filteredRows = computed(() =>
  attendanceRows.value.filter(r =>
    !searchQuery.value || r.name.includes(searchQuery.value)
  )
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Session info -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 px-3 py-2 rounded-xl" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);">
        <UIcon name="i-lucide-calendar" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
        <span class="body-md font-arabic" style="color: var(--color-on-surface);">الاثنين، ٢٣ أكتوبر ٢٠٢٣</span>
      </div>
      <div class="flex items-center gap-2 px-3 py-2 rounded-xl" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);">
        <UIcon name="i-lucide-users" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
        <span class="body-md font-arabic" style="color: var(--color-on-surface);">مجموعة أ</span>
      </div>
    </div>

    <!-- Stats -->
    <AttendanceStats />

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

    <!-- Student rows -->
    <div class="flex flex-col gap-3">
      <AttendanceRow
        v-for="row in filteredRows"
        :key="row.studentId"
        v-bind="row"
      />
    </div>

    <!-- Session notes -->
    <div class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);">
      <div class="flex items-center justify-between mb-3">
        <p class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">ملاحظات الجلسة</p>
        <UButton variant="ghost" color="neutral" icon="i-lucide-sparkles" size="sm" label="مساعد ذكي" />
      </div>

      <textarea
        v-model="sessionNotes"
        rows="3"
        placeholder="اكتب ملاحظاتك هنا..."
        class="w-full resize-none rounded-xl p-3 text-sm font-arabic outline-none"
        style="background-color: var(--color-surface-container-low); color: var(--color-on-surface);"
      />

      <!-- Quick tags -->
      <div class="flex items-center gap-2 mt-3 flex-wrap">
        <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">إضافة سريعة:</span>
        <button
          v-for="tag in quickTags"
          :key="tag"
          class="px-3 py-1 rounded-full text-xs font-arabic transition-colors"
          style="background-color: var(--color-surface-container); color: var(--color-on-surface-variant);"
          @click="appendNote(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>
  </div>
</template>
