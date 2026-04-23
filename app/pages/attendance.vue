<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { attendanceRows, sessionNotes, isLoading, appendNote, loadSession } = useAttendance()
const { halaqat, fetchHalaqat } = useHalaqat()
const { user } = useAuth()

const selectedHalaqaId = ref<number | null>(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const quickTags = ['تفاعل ممتاز', 'مراجعة جماعية', 'تم الانتهاء من جزء']
const searchQuery = ref('')

const filteredRows = computed(() =>
  attendanceRows.value.filter(r =>
    !searchQuery.value || r.name.includes(searchQuery.value)
  )
)

const halaqaOptions = computed(() =>
  halaqat.value.map(h => ({ label: h.name, value: h.id }))
)

const selectedHalaqaName = computed(() =>
  halaqat.value.find(h => h.id === selectedHalaqaId.value)?.name || 'اختر الحلقة'
)

const formattedDate = computed(() => {
  if (!selectedDate.value) return '—'
  return new Date(selectedDate.value).toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})

async function onHalaqaChange() {
  if (selectedHalaqaId.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
}

async function onDateChange() {
  if (selectedHalaqaId.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
}

onMounted(async () => {
  await fetchHalaqat()
  if (halaqat.value.length > 0) {
    selectedHalaqaId.value = halaqat.value[0].id
    await loadSession(halaqat.value[0].id, selectedDate.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Session controls -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Halaqa selector -->
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-xl"
        style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
      >
        <UIcon name="i-lucide-users" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
        <select
          v-model="selectedHalaqaId"
          class="bg-transparent text-sm font-arabic outline-none cursor-pointer"
          style="color: var(--color-on-surface);"
          @change="onHalaqaChange"
        >
          <option v-if="halaqat.length === 0" :value="null">لا توجد حلقات</option>
          <option v-for="h in halaqat" :key="h.id" :value="h.id">{{ h.name }}</option>
        </select>
      </div>

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
    </div>

    <!-- Stats -->
    <AttendanceStats />

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin" style="color: var(--color-primary);" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!selectedHalaqaId"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-users" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
      <p class="body-md font-arabic" style="color: var(--color-on-surface-variant);">اختر حلقة لبدء تسجيل الحضور</p>
    </div>

    <template v-else>
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
      <div v-if="filteredRows.length > 0" class="flex flex-col gap-3">
        <AttendanceRow
          v-for="row in filteredRows"
          :key="row.studentId"
          v-bind="row"
        />
      </div>
      <div
        v-else
        class="flex flex-col items-center gap-3 py-12 rounded-2xl"
        style="background-color: var(--color-surface-container-lowest);"
      >
        <UIcon name="i-lucide-user-x" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
        <p class="body-md font-arabic" style="color: var(--color-on-surface-variant);">لا يوجد طلاب في هذه الحلقة</p>
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
    </template>
  </div>
</template>
