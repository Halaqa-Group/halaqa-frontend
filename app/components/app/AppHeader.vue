<script setup lang="ts">
const route = useRoute()
const { isEditMode } = useSchedule()

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
        <UButton variant="soft" color="neutral" label="حفظ كمسودة" icon="i-lucide-save" />
        <UButton color="primary" label="إرسال الجلسة" icon="i-lucide-send" />
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

      <!-- Default: avatar stack + notification -->
      <template v-else>
        <div class="flex items-center -space-x-2 space-x-reverse">
          <img
            v-for="seed in ['amira', 'zaid', 'omar']"
            :key="seed"
            :src="`https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`"
            class="w-8 h-8 rounded-full border-2 border-white"
          >
        </div>
        <div class="relative">
          <UButton variant="ghost" color="neutral" icon="i-lucide-bell" />
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EFB0C1]" />
        </div>
      </template>
    </div>
  </header>
</template>
