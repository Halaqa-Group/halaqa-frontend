<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { openView, openEdit } = useStudents()

const isActive = computed(() => props.student.status === 'active')
</script>

<template>
  <div
    class="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col gap-5 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
  >
    <!-- Header: avatar + name + status badge -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-4">
        <div class="relative shrink-0">
          <img
            :src="student.avatar"
            :alt="student.name"
            class="w-16 h-16 rounded-full object-cover"
            style="border: 2px solid rgba(128, 76, 125, 0.2);"
          >
          <span
            class="absolute bottom-0 end-0 w-4 h-4 rounded-full border-2 border-white"
            :class="isActive ? 'bg-[#2A6B64]' : 'bg-[#B5174E]'"
          />
        </div>
        <h3 class="text-xl font-bold leading-tight" style="color: var(--color-on-surface);">
          {{ student.name }}
        </h3>
      </div>

      <!-- Status badge (top right) -->
      <span
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shrink-0"
        :style="isActive
          ? 'background-color: #E0F0EE; color: #2A6B64;'
          : 'background-color: #FCE4EC; color: #B5174E;'"
      >{{ isActive ? 'نشط' : 'غير نشط' }}</span>
    </div>

    <!-- Progress bar -->
    <div :class="{ 'opacity-60': !isActive }">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm" style="color: var(--color-on-surface-variant);">سورة {{ student.currentSurah }}</span>
        <span class="text-sm font-bold" style="color: var(--color-primary);">{{ student.progress }}%</span>
      </div>
      <div class="w-full h-2 rounded-full overflow-hidden" style="background-color: var(--color-primary-container);">
        <div
          class="h-full rounded-full transition-all"
          style="background-color: var(--color-primary);"
          :style="{ width: `${student.progress}%` }"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <UButton
        variant="soft"
        color="primary"
        block
        size="md"
        label="عرض الملف"
        class="flex-1 py-2.5 px-4 text-sm hover:opacity-80 active:scale-95"
        style="background-color: var(--color-primary-container); color: var(--color-primary);"
        @click="openView(student)"
      />
      <UButton
        variant="soft"
        color="primary"
        icon="i-lucide-pencil"
        size="md"
        class="p-2.5 hover:opacity-80"
        style="background-color: rgba(128, 76, 125, 0.08); color: var(--color-primary);"
        :ui="{ leadingIcon: 'w-5 h-5' }"
        @click="openEdit(student)"
      />
    </div>
  </div>
</template>
