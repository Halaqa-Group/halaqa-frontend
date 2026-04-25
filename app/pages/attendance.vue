<script setup lang="ts">
const { t, locale } = useI18n()
const { attendanceRows, sessionNotes, isLoading, isSaving, appendNote, loadSession, submitSession } = useAttendance()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const { user } = useAuth()
const toast = useToast()

const _today = new Date()
const selectedDate = ref(`${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`)
const quickTags = computed(() => [
  t('pages.attendance.quickTags.excellentEngagement'),
  t('pages.attendance.quickTags.groupReview'),
  t('pages.attendance.quickTags.partCompleted')
])
const searchQuery = ref('')
const showSuccessMessage = ref(false)

const filteredRows = computed(() =>
  attendanceRows.value.filter(r =>
    !searchQuery.value || r.name.includes(searchQuery.value)
  )
)

const formattedDate = computed(() => {
  if (!selectedDate.value) return '—'
  return new Date(selectedDate.value).toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
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
      title: t('pages.attendance.savedToastTitle'),
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: t('pages.attendance.saveErrorTitle'),
      description: error.message || t('pages.attendance.saveErrorFallback'),
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
    <!-- Screen header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          {{ $t('pages.attendance.recordLabel') }}
        </span>
        <h2 class="display-lg" style="color: var(--color-on-surface);">
          {{ $t('pages.attendance.title') }}
        </h2>
        <p class="text-sm" style="color: var(--color-on-surface-variant);">
          {{ $t('pages.attendance.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Stats -->
    <AttendanceStats class="mb-8" />

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
      <p class="body-md" style="color: var(--color-on-surface-variant);">
        {{ $t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <!-- Two-column layout: records (right) + calendar sidebar (left) -->
      <div class="flex gap-10 items-start">
        <!-- Records column -->
        <div class="flex-1 min-w-0 flex flex-col gap-4">
          <!-- Search + Save -->
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchQuery"
              type="text"
              :placeholder="$t('pages.attendance.searchPlaceholder')"
              trailing-icon="i-lucide-search"
              variant="none"
              class="flex-1"
              :ui="{
                base: 'w-full pe-11 ps-4 py-3 rounded-2xl text-base bg-surface-container-lowest text-on-surface border-[1.5px] border-outline-variant focus:ring-2 focus:ring-primary/30',
                trailing: 'absolute inset-y-0 end-4',
                trailingIcon: 'w-4 h-4 text-on-surface-variant'
              }"
            />
            <UButton
              :loading="isSaving"
              :disabled="isSaving"
              icon="i-lucide-save"
              size="lg"
              color="primary"
              class="font-bold rounded-full shrink-0 px-8 py-3 text-base cursor-pointer"
              @click="handleSaveAttendance"
            >
              {{ $t('pages.attendance.saveAttendance') }}
            </UButton>
          </div>

          <!-- Student rows -->
          <div v-if="filteredRows.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
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
            <p class="body-md" style="color: var(--color-on-surface-variant);">
              {{ $t('pages.attendance.noStudentsInHalaqa') }}
            </p>
          </div>

          <!-- Success message -->
          <div
            v-if="showSuccessMessage"
            class="rounded-2xl p-4 flex items-center justify-between mt-8"
            style="background-color: #E0F0EE; border: 1px solid #4A8E85;"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-check-circle" class="w-5 h-5" style="color: #4A8E85;" />
              <p class="body-lg" style="color: #4A8E85;">
                {{ $t('pages.attendance.successMessage') }}
              </p>
            </div>
            <NuxtLink
              to="/achievements"
              class="px-4 py-2 rounded-xl text-sm font-semibold transition-colors no-underline"
              style="background-color: #4A8E85; color: white;"
            >
              {{ $t('pages.attendance.goToAchievements') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Calendar sidebar (left in RTL) -->
        <div class="shrink-0 w-[340px] hidden lg:flex lg:flex-col lg:gap-6">
          <AttendanceCalendar
            v-model="selectedDate"
            @update:model-value="onDateChange"
          />

          <!-- Session notes -->
          <div class="rounded-2xl p-5" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);">
            <div class="flex items-center justify-between mb-3">
              <p class="body-lg font-semibold" style="color: var(--color-on-surface);">
                {{ $t('pages.attendance.sessionNotes') }}
              </p>
              <UButton variant="ghost" color="neutral" icon="i-lucide-sparkles" size="sm" :label="$t('pages.attendance.smartAssistant')" />
            </div>
            <UTextarea
              v-model="sessionNotes"
              :rows="3"
              :placeholder="$t('pages.attendance.notesPlaceholder')"
              variant="none"
              class="w-full"
              :ui="{
                base: 'w-full resize-none rounded-xl p-3 text-sm bg-surface-container-low text-on-surface'
              }"
            />
            <div class="flex items-center gap-2 mt-3 flex-wrap">
              <span class="label-md" style="color: var(--color-on-surface-variant);">{{ $t('pages.attendance.quickAdd') }}</span>
              <UButton
                v-for="tag in quickTags"
                :key="tag"
                variant="soft"
                color="neutral"
                size="xs"
                :label="tag"
                class="px-3 py-1 rounded-full text-xs font-normal"
                @click="appendNote(tag)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
