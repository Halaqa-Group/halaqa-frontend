<script setup lang="ts">
const route = useRoute()
const { user, logout } = useAuth()
const { selectedHalaqaName, openModal } = useGlobalHalaqa()
const { isSaving, submitSession, attendanceRows } = useAttendance()

const isAttendance = computed(() => route.path === '/attendance')
const hasAttendanceRows = computed(() => attendanceRows.value.length > 0)

const submitLabel = computed(() => isSaving.value ? 'جاري الإرسال...' : 'إرسال الجلسة')

</script>

<template>
  <header
    class="relative flex items-center px-8 py-4 shrink-0"
    style="background-color: var(--color-surface-container-lowest); border-bottom: 1px solid var(--color-outline-variant);"
  >
    <!-- School name -->
    <span class="text-xl font-arabic font-bold" style="color: var(--color-on-surface);">{{ user?.school_name ?? '...' }}</span>

    <!-- Halaqa selector — absolutely centered -->
    <button
      class="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-2xl transition-colors hover:opacity-80 cursor-pointer"
      style="background-color: var(--color-primary-container);"
      @click="openModal"
    >
      <UIcon name="i-lucide-layers" class="w-4 h-4 shrink-0" style="color: var(--color-primary);" />
      <span class="text-sm font-arabic font-semibold" style="color: var(--color-primary);">{{ selectedHalaqaName }}</span>
    </button>

    <!-- Context actions -->
    <div class="flex items-center gap-3 ms-auto">
      <!-- Attendance page actions -->
      <template v-if="isAttendance">
        <UButton variant="soft" color="neutral" label="حفظ كمسودة" icon="i-lucide-save" :disabled="!hasAttendanceRows" />
        <UButton color="primary" :label="submitLabel" icon="i-lucide-send" :loading="isSaving" :disabled="!hasAttendanceRows || isSaving" @click="submitSession" />
      </template>

      <!-- Default: notification + profile -->
      <template v-else>
        <div class="relative">
          <UButton variant="ghost" color="neutral" icon="i-lucide-bell" />
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EFB0C1]" />
        </div>
        <UDropdownMenu
          :items="[[{ label: user?.name ?? '', icon: 'i-lucide-user', disabled: true }, { label: 'تسجيل الخروج', icon: 'i-lucide-log-out', onSelect: logout }]]"
          :ui="{ content: 'font-arabic' }"
        >
          <UButton variant="ghost" color="neutral" icon="i-lucide-user-circle" />
        </UDropdownMenu>
      </template>
    </div>
  </header>
</template>
