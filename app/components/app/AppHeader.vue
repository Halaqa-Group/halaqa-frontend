<script setup lang="ts">
const route = useRoute()
const { isEditMode } = useSchedule()
const { user, logout } = useAuth()
const { isSaving, submitSession, attendanceRows } = useAttendance()

const PAGE_LABELS: Record<string, string> = {
  '/': 'لوحة التحكم',
  '/attendance': 'الحضور والتسجيل',
  '/students': 'إدارة الطلاب',
  '/planner': 'المخطط الأسبوعي',
  '/analytics': 'التحليلات',
  '/tasks': 'المهام'
}

const pageLabel = computed(() => PAGE_LABELS[route.path] || '')
const isPlanner = computed(() => route.path === '/planner')
const isAttendance = computed(() => route.path === '/attendance')
const hasAttendanceRows = computed(() => attendanceRows.value.length > 0)

const submitLabel = computed(() => isSaving.value ? 'جاري الإرسال...' : 'إرسال الجلسة')

function toggleEdit() {
  isEditMode.value = !isEditMode.value
}
</script>

<template>
  <header
    class="flex items-center justify-between px-8 py-4 shrink-0"
    style="background-color: var(--color-surface-container-lowest); border-bottom: 1px solid var(--color-outline-variant);"
  >
    <!-- Page title -->
    <div>
      <p class="label-md" style="color: var(--color-on-surface-variant);">أكاديمية القرآن</p>
      <h1 class="display-md font-arabic" style="color: var(--color-on-surface);">{{ pageLabel }}</h1>
    </div>

    <!-- Context actions -->
    <div class="flex items-center gap-3">
      <!-- Attendance page actions -->
      <template v-if="isAttendance">
        <UButton
          variant="soft"
          color="neutral"
          label="حفظ كمسودة"
          icon="i-lucide-save"
          :disabled="!hasAttendanceRows"
        />
        <UButton
          color="primary"
          :label="submitLabel"
          icon="i-lucide-send"
          :loading="isSaving"
          :disabled="!hasAttendanceRows || isSaving"
          @click="submitSession"
        />
      </template>

      <!-- Planner page actions -->
      <template v-else-if="isPlanner">
        <UButton variant="soft" color="neutral" label="نسخ من الأسبوع الماضي" icon="i-lucide-copy" />
        <UButton
          :color="isEditMode ? 'primary' : 'neutral'"
          :variant="isEditMode ? 'solid' : 'soft'"
          :label="isEditMode ? 'حفظ التغييرات' : 'تعديل الخطة'"
          :icon="isEditMode ? 'i-lucide-save' : 'i-lucide-file-edit'"
          @click="toggleEdit"
        />
      </template>

      <!-- Default: user info + notification -->
      <template v-else>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl" style="background-color: var(--color-surface-container);">
          <UIcon name="i-lucide-user" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
          <span class="label-md font-arabic" style="color: var(--color-on-surface);">{{ user?.name }}</span>
        </div>
        <div class="relative">
          <UButton variant="ghost" color="neutral" icon="i-lucide-bell" />
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EFB0C1]" />
        </div>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-log-out"
          @click="logout"
        />
      </template>
    </div>
  </header>
</template>
