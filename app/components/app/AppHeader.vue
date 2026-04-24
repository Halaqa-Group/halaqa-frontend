<script setup lang="ts">
const route = useRoute()
const { user, logout } = useAuth()
const { isSaving, submitSession, attendanceRows } = useAttendance()

const isAttendance = computed(() => route.path === '/attendance')
const hasAttendanceRows = computed(() => attendanceRows.value.length > 0)

const submitLabel = computed(() => isSaving.value ? 'جاري الإرسال...' : 'إرسال الجلسة')

</script>

<template>
  <header
    class="flex items-center justify-between px-8 py-4 shrink-0"
    style="background-color: var(--color-surface-container-lowest); border-bottom: 1px solid var(--color-outline-variant);"
  >
    <span class="text-xl font-arabic font-bold" style="color: var(--color-on-surface);">{{ user?.school_name ?? '...' }}</span>

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
