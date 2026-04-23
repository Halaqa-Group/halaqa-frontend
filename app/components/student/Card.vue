<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { openView } = useStudents()

const isActive = computed(() => props.student.status === 'active')
const attendanceColor = computed(() =>
  props.student.attendance >= 75 ? 'var(--color-secondary)' : 'var(--color-error)'
)
</script>

<template>
  <div
    class="bg-white rounded-2xl p-6 transition-shadow duration-300 hover:shadow-lg"
    style="border: 1px solid #F0F0F0;"
  >
    <!-- Card header: avatar + name + status + more button -->
    <div class="flex items-start justify-between mb-6">
      <div class="flex items-center gap-4">
        <img
          :src="student.avatar"
          :alt="student.name"
          class="w-14 h-14 rounded-full object-cover shrink-0"
          style="border: 2px solid rgba(128, 76, 125, 0.2);"
        >
        <div>
          <h3 class="text-lg font-bold font-arabic leading-tight" style="color: var(--color-on-surface);">
            {{ student.name }}
          </h3>
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-arabic mt-1"
            :style="isActive
              ? 'background-color: var(--color-primary-container); color: var(--color-primary);'
              : 'background-color: #eae0e5; color: var(--color-on-surface-variant);'"
          >{{ isActive ? 'نشط' : 'غير نشط' }}</span>
        </div>
      </div>
      <button
        class="p-2 rounded-full transition-colors hover:bg-black/5"
        style="color: var(--color-on-surface-variant);"
      >
        <UIcon name="i-lucide-ellipsis-vertical" class="w-5 h-5" />
      </button>
    </div>

    <!-- Progress + stats (dimmed when inactive) -->
    <div class="space-y-4" :class="{ 'opacity-75': !isActive }">
      <!-- Current surah + progress bar -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-arabic" style="color: var(--color-on-surface-variant);">الحالي: سورة {{ student.currentSurah }}</span>
          <span class="text-xs font-bold font-arabic" style="color: var(--color-primary);">{{ student.progress }}%</span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden" style="background-color: var(--color-primary-container);">
          <div
            class="h-full rounded-full transition-all"
            style="background-color: var(--color-primary);"
            :style="{ width: `${student.progress}%` }"
          />
        </div>
      </div>

      <!-- 2-col stat chips -->
      <div class="grid grid-cols-2 gap-4 pt-2">
        <div class="p-3 rounded-xl text-right" style="background-color: #F5F5F5;">
          <span class="block text-[10px] uppercase font-bold tracking-tight font-arabic mb-0.5" style="color: var(--color-outline);">الحلقة</span>
          <span class="text-sm font-semibold font-arabic" style="color: var(--color-on-surface);">{{ student.halaqa }}</span>
        </div>
        <div class="p-3 rounded-xl text-right" style="background-color: #F5F5F5;">
          <span class="block text-[10px] uppercase font-bold tracking-tight font-arabic mb-0.5" style="color: var(--color-outline);">الحضور</span>
          <span class="text-sm font-semibold font-arabic" :style="`color: ${attendanceColor};`">{{ student.attendance }}%</span>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="mt-6 flex items-center gap-2">
      <button
        class="flex-1 py-2 px-4 rounded-lg text-sm font-arabic font-semibold transition-colors hover:opacity-80 active:scale-95"
        style="background-color: rgba(102, 53, 100, 0.05); color: var(--color-primary);"
        @click="openView(student)"
      >
        عرض الملف
      </button>
      <button
        class="p-2 rounded-lg transition-colors hover:opacity-80"
        style="background-color: rgba(53, 102, 104, 0.05); color: var(--color-secondary);"
      >
        <UIcon name="i-lucide-message-circle" class="w-5 h-5" />
      </button>
      <button
        class="p-2 rounded-lg transition-colors hover:opacity-80"
        style="background-color: rgba(105, 93, 69, 0.1); color: var(--color-tertiary);"
      >
        <UIcon name="i-lucide-pencil" class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>
