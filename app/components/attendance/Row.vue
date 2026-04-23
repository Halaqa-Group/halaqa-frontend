<script setup lang="ts">
import { SURAHS } from '~/data/constants'
import type { AttendanceStatus } from '~/types'

const props = defineProps<{
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
  mistakes: number
  rating: number
  surah: string
}>()

const { setStatus, addMistake, removeMistake, setRating, setSurah } = useAttendance()

const statusButtons: { key: AttendanceStatus; label: string; color: string; activeColor: string }[] = [
  { key: 'present', label: 'حاضر', color: 'bg-[#E0F0EE] text-[#4A8E85]', activeColor: 'bg-[#4A8E85] text-white' },
  { key: 'late', label: 'متأخر', color: 'bg-[#FFF3E0] text-[#F57C00]', activeColor: 'bg-[#F57C00] text-white' },
  { key: 'absent', label: 'غائب', color: 'bg-[#FCE4EC] text-[#D81B60]', activeColor: 'bg-[#D81B60] text-white' }
]
</script>

<template>
  <div
    class="rounded-2xl p-4 flex items-start gap-4"
    style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
  >
    <!-- Avatar + status dot -->
    <div class="relative shrink-0">
      <img :src="avatar" class="w-10 h-10 rounded-full" :alt="name">
      <span
        class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
        :class="status === 'present' ? 'bg-[#4A8E85]' : status === 'late' ? 'bg-[#F57C00]' : 'bg-[#D81B60]'"
      />
    </div>

    <!-- Main content -->
    <div class="flex-1 grid grid-cols-2 gap-x-4 gap-y-3">
      <!-- Name + surah -->
      <div>
        <p class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">{{ name }}</p>
        <p class="label-md font-arabic" style="color: var(--color-on-surface-variant);">{{ currentSurah }}</p>
      </div>

      <!-- Status buttons -->
      <div class="flex items-center gap-2">
        <button
          v-for="btn in statusButtons"
          :key="btn.key"
          class="px-3 py-1 rounded-full text-xs font-arabic transition-colors"
          :class="status === btn.key ? btn.activeColor : btn.color"
          @click="setStatus(studentId, btn.key)"
        >
          {{ btn.label }}
        </button>
      </div>

      <!-- Surah selector -->
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-book" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
        <select
          :value="surah"
          class="text-sm font-arabic outline-none bg-transparent flex-1"
          style="color: var(--color-on-surface);"
          @change="setSurah(studentId, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in SURAHS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <!-- Mistakes counter -->
      <div class="flex items-center gap-2">
        <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">الأخطاء:</span>
        <button
          class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style="background-color: var(--color-surface-container);"
          @click="removeMistake(studentId)"
        >
          <UIcon name="i-lucide-minus" class="w-3 h-3" />
        </button>
        <span class="body-md font-semibold w-6 text-center" style="color: var(--color-on-surface);">{{ mistakes }}</span>
        <button
          class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style="background-color: var(--color-surface-container);"
          @click="addMistake(studentId)"
        >
          <UIcon name="i-lucide-plus" class="w-3 h-3" />
        </button>
      </div>

      <!-- Tajwid rating -->
      <div class="col-span-2 flex items-center gap-2">
        <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">التجويد:</span>
        <div class="flex gap-1">
          <button
            v-for="star in 5"
            :key="star"
            @click="setRating(studentId, star)"
          >
            <UIcon
              name="i-lucide-star"
              class="w-4 h-4 transition-colors"
              :style="star <= rating ? 'color: #F57C00; fill: #F57C00;' : 'color: var(--color-outline-variant);'"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
