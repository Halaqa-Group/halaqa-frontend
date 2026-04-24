<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { attendanceRows, sessionNotes, isLoading, isSaving, appendNote, loadSession, submitSession } = useAttendance()
const { selectedHalaqaId, selectedHalaqaName, hasHalaqa } = useGlobalHalaqa()
const { user } = useAuth()
const toast = useToast()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const quickTags = ['تفاعل ممتاز', 'مراجعة جماعية', 'تم الانتهاء من جزء']
const searchQuery = ref('')
const showSuccessMessage = ref(false)

const filteredRows = computed(() =>
  attendanceRows.value.filter(r =>
    !searchQuery.value || r.name.includes(searchQuery.value)
  )
)

const formattedDate = computed(() => {
  if (!selectedDate.value) return '—'
  return new Date(selectedDate.value).toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})

// Load session when date changes
async function onDateChange() {
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
  showSuccessMessage.value = false
}

// Watch for halaqa changes from global selector
watch(selectedHalaqaId, async (newHalaqaId, oldHalaqaId) => {
  // Only load if halaqaId changed and is valid (not initial null)
  if (newHalaqaId && newHalaqaId !== oldHalaqaId && selectedDate.value) {
    await loadSession(newHalaqaId, selectedDate.value)
    showSuccessMessage.value = false
  }
})

async function handleSaveAttendance() {
  try {
    await submitSession()
    showSuccessMessage.value = true
    toast.add({
      title: 'تم حفظ الحضور بنجاح',
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'خطأ في حفظ الحضور',
      description: error.message || 'حدث خطأ غير متوقع',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

onMounted(async () => {
  // Load session for currently selected global halaqa
  if (selectedHalaqaId.value && selectedDate.value) {
    await loadSession(selectedHalaqaId.value, selectedDate.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Session controls -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Selected Halaqa Display -->
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-xl"
        style="background-color: var(--color-primary-container); box-shadow: var(--shadow-card);"
      >
        <UIcon name="i-lucide-layers" class="w-4 h-4" style="color: var(--color-primary);" />
        <span class="text-sm font-arabic font-semibold" style="color: var(--color-primary);">
          {{ selectedHalaqaName }}
        </span>
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
      v-else-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-2xl"
      style="background-color: var(--color-surface-container-lowest);"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10" style="color: var(--color-on-surface-variant);" />
      <p class="body-md font-arabic" style="color: var(--color-on-surface-variant);">
        استخدم أيقونة الحلقات في الشريط الجانبي لاختيار حلقة
      </p>
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

      <!-- Save button -->
      <div class="flex justify-end">
        <UButton
          :loading="isSaving"
          :disabled="isSaving"
          icon="i-lucide-save"
          size="lg"
          color="primary"
          @click="handleSaveAttendance"
        >
          حفظ الحضور
        </UButton>
      </div>

      <!-- Success message with link to achievements -->
      <div
        v-if="showSuccessMessage"
        class="rounded-2xl p-4 flex items-center justify-between"
        style="background-color: #E0F0EE; border: 1px solid #4A8E85;"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5" style="color: #4A8E85;" />
          <p class="body-md font-arabic" style="color: #4A8E85;">
            تم حفظ الحضور بنجاح. يمكنك الآن الانتقال إلى صفحة الإنجازات لتسجيل إنجازات الطلاب.
          </p>
        </div>
        <NuxtLink
          to="/achievements"
          class="px-4 py-2 rounded-xl text-sm font-arabic font-semibold transition-colors no-underline"
          style="background-color: #4A8E85; color: white;"
        >
          الانتقال إلى الإنجازات
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
