<script setup lang="ts">
import { ref, computed } from 'vue'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { isValidVerseRange, VERSE_COUNTS } from '~/utils/quran'
import type { CreateAchievementDto, StudentWithAttendance } from '~/types'

const props = defineProps<{
  student: StudentWithAttendance
  halaqaId: number
  date: string
}>()

const emit = defineEmits<{
  submit: [data: CreateAchievementDto]
}>()

const trackType = ref<'Hifz' | 'Near' | 'Far'>('Hifz')
const startSurah = ref(1)
const startVerse = ref(1)
const endSurah = ref(1)
const endVerse = ref(7)
const mistakesCount = ref(0)
const warningsCount = ref(0)
const tajweedErrorsCount = ref(0)
const teacherNotes = ref('')
const validationError = ref<string | null>(null)

const surahOptions = computed(() =>
  Object.entries(SURAH_NAMES).map(([num, name]) => ({ value: Number(num), label: name }))
)

const maxStartVerse = computed(() => VERSE_COUNTS[startSurah.value] || 1)
const maxEndVerse = computed(() => VERSE_COUNTS[endSurah.value] || 1)

function validate(): boolean {
  const result = isValidVerseRange(startSurah.value, startVerse.value, endSurah.value, endVerse.value)
  if (!result.valid) { validationError.value = result.error || 'خطأ في النطاق'; return false }
  validationError.value = null
  return true
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', {
    student_id: props.student.id,
    halaqa_id: props.halaqaId,
    date: props.date,
    track_type: trackType.value,
    start_surah: startSurah.value,
    start_verse: startVerse.value,
    end_surah: endSurah.value,
    end_verse: endVerse.value,
    mistakes_count: mistakesCount.value,
    warnings_count: warningsCount.value,
    tajweed_errors_count: tajweedErrorsCount.value,
    teacher_notes: teacherNotes.value || undefined
  })
  resetForm()
}

function resetForm() {
  trackType.value = 'Hifz'
  startSurah.value = 1; startVerse.value = 1
  endSurah.value = 1; endVerse.value = 7
  mistakesCount.value = 0; warningsCount.value = 0; tajweedErrorsCount.value = 0
  teacherNotes.value = ''; validationError.value = null
}

function increment(field: 'mistakes' | 'warnings' | 'tajweed') {
  if (field === 'mistakes') mistakesCount.value++
  else if (field === 'warnings') warningsCount.value++
  else tajweedErrorsCount.value++
}

function decrement(field: 'mistakes' | 'warnings' | 'tajweed') {
  if (field === 'mistakes' && mistakesCount.value > 0) mistakesCount.value--
  else if (field === 'warnings' && warningsCount.value > 0) warningsCount.value--
  else if (field === 'tajweed' && tajweedErrorsCount.value > 0) tajweedErrorsCount.value--
}

const fieldUi = {
  base: 'w-full border-none rounded-xl px-3 py-2.5 text-sm bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary/30'
}
const numberFieldUi = {
  base: 'w-full border-none rounded-xl px-2 py-2.5 text-sm bg-surface-container-lowest text-on-surface text-center focus:ring-2 focus:ring-primary/30'
}
const labelUi = {
  label: 'block text-[10px] font-bold uppercase mb-1.5 text-center text-outline'
}
</script>

<template>
  <div
    class="rounded-2xl overflow-hidden"
    style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
  >
    <!-- Header -->
    <div class="px-6 pt-5 pb-4 flex items-center gap-3" style="border-bottom: 1px solid var(--color-outline-variant);">
      <img :src="student.avatar" class="w-10 h-10 rounded-full object-cover shrink-0" :alt="student.name">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold uppercase tracking-widest mb-0.5" style="color: var(--color-primary);">
          تسجيل إنجاز
        </p>
        <p class="text-xl font-bold truncate leading-tight" style="color: var(--color-on-surface);">
          {{ student.name }}
        </p>
      </div>
    </div>

    <div class="px-6 pt-5 pb-6 flex flex-col gap-5">
      <!-- Track type -->
      <div class="flex items-center p-1 rounded-full" style="background-color: var(--color-surface-container-low);">
        <UButton
          v-for="type in TRACK_TYPES"
          :key="type.value"
          variant="ghost"
          color="neutral"
          :label="type.label"
          class="flex-1 py-2 rounded-full text-sm font-semibold justify-center"
          :style="trackType === type.value
            ? `background-color: var(${type.colorVar}); color: white; box-shadow: 0 2px 8px color-mix(in srgb, var(${type.colorVar}) 25%, transparent);`
            : 'color: var(--color-on-surface-variant);'"
          @click="trackType = type.value as 'Hifz' | 'Near' | 'Far'"
        />
      </div>

      <!-- Range: 4 fields in one row -->
      <div class="rounded-2xl p-4 flex flex-col gap-3" style="background-color: var(--color-surface-container-low);">
        <div class="flex gap-2 items-end">
          <!-- Start surah -->
          <UFormField label="من — السورة" class="flex-[3]" :ui="labelUi">
            <USelect
              v-model="startSurah"
              :items="surahOptions"
              variant="none"
              class="w-full"
              :ui="fieldUi"
            />
          </UFormField>
          <!-- Start verse -->
          <UFormField label="الآية" class="flex-1" :ui="labelUi">
            <UInput
              v-model.number="startVerse"
              type="number"
              :min="1"
              :max="maxStartVerse"
              variant="none"
              class="w-full"
              :ui="numberFieldUi"
            />
          </UFormField>
          <!-- Divider -->
          <div class="pb-2.5 px-0.5">
            <UIcon name="i-lucide-arrow-left-right" class="w-3.5 h-3.5" style="color: var(--color-outline);" />
          </div>
          <!-- End surah -->
          <UFormField label="إلى — السورة" class="flex-[3]" :ui="labelUi">
            <USelect
              v-model="endSurah"
              :items="surahOptions"
              variant="none"
              class="w-full"
              :ui="fieldUi"
            />
          </UFormField>
          <!-- End verse -->
          <UFormField label="الآية" class="flex-1" :ui="labelUi">
            <UInput
              v-model.number="endVerse"
              type="number"
              :min="1"
              :max="maxEndVerse"
              variant="none"
              class="w-full"
              :ui="numberFieldUi"
            />
          </UFormField>
        </div>

        <!-- Validation error -->
        <div
          v-if="validationError"
          class="px-3 py-2 rounded-lg flex items-center gap-2"
          style="background-color: var(--color-track-near-bg);"
        >
          <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0" style="color: var(--color-track-near);" />
          <p class="label-sm" style="color: var(--color-track-near);">
            {{ validationError }}
          </p>
        </div>
      </div>

      <!-- Counters: 3 in one row, big and clear -->
      <div class="grid grid-cols-3 gap-3">
        <!-- Mistakes -->
        <div
          class="rounded-2xl p-4 flex flex-col items-center gap-3"
          style="background-color: var(--color-surface-container-low);"
        >
          <span class="text-[10px] font-bold uppercase" style="color: var(--color-outline);">أخطاء</span>
          <span class="text-3xl font-bold" style="color: var(--color-primary);">{{ mistakesCount }}</span>
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              color="primary"
              icon="i-lucide-minus"
              class="w-9 h-9 rounded-full justify-center hover:scale-105 active:scale-95"
              style="background-color: rgba(128,76,125,0.12); color: var(--color-primary);"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="decrement('mistakes')"
            />
            <UButton
              variant="ghost"
              color="primary"
              icon="i-lucide-plus"
              class="w-9 h-9 rounded-full justify-center hover:scale-105 active:scale-95"
              style="background-color: rgba(128,76,125,0.12); color: var(--color-primary);"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="increment('mistakes')"
            />
          </div>
        </div>

        <!-- Warnings -->
        <div
          class="rounded-2xl p-4 flex flex-col items-center gap-3"
          style="background-color: var(--color-surface-container-low);"
        >
          <span class="text-[10px] font-bold uppercase" style="color: var(--color-outline);">تنبيهات</span>
          <span class="text-3xl font-bold" style="color: var(--color-secondary);">{{ warningsCount }}</span>
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              color="secondary"
              icon="i-lucide-minus"
              class="w-9 h-9 rounded-full justify-center hover:scale-105 active:scale-95"
              style="background-color: rgba(53,102,104,0.12); color: var(--color-secondary);"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="decrement('warnings')"
            />
            <UButton
              variant="ghost"
              color="secondary"
              icon="i-lucide-plus"
              class="w-9 h-9 rounded-full justify-center hover:scale-105 active:scale-95"
              style="background-color: rgba(53,102,104,0.12); color: var(--color-secondary);"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="increment('warnings')"
            />
          </div>
        </div>

        <!-- Tajweed -->
        <div
          class="rounded-2xl p-4 flex flex-col items-center gap-3"
          style="background-color: var(--color-surface-container-low);"
        >
          <span class="text-[10px] font-bold uppercase" style="color: var(--color-outline);">تجويد</span>
          <span class="text-3xl font-bold" style="color: var(--color-tertiary);">{{ tajweedErrorsCount }}</span>
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-minus"
              class="w-9 h-9 rounded-full justify-center hover:scale-105 active:scale-95"
              style="background-color: rgba(128,76,125,0.08); color: var(--color-tertiary);"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="decrement('tajweed')"
            />
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-plus"
              class="w-9 h-9 rounded-full justify-center hover:scale-105 active:scale-95"
              style="background-color: rgba(128,76,125,0.08); color: var(--color-tertiary);"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="increment('tajweed')"
            />
          </div>
        </div>
      </div>

      <!-- Notes -->
      <UTextarea
        v-model="teacherNotes"
        :rows="2"
        placeholder="ملاحظات المعلم..."
        variant="none"
        class="w-full"
        :ui="{
          base: 'w-full resize-none rounded-xl px-4 py-3 text-sm bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/30'
        }"
      />

      <!-- Submit -->
      <UButton
        variant="solid"
        color="primary"
        icon="i-lucide-save"
        label="حفظ الإنجاز"
        block
        size="lg"
        class="w-full py-3 rounded-full text-base hover:opacity-90 active:scale-95"
        style="box-shadow: 0 4px 14px rgba(128,76,125,0.3);"
        :ui="{ leadingIcon: 'w-5 h-5' }"
        @click="handleSubmit"
      />
    </div>
  </div>
</template>
