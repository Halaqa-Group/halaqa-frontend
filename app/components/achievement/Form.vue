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

// Form state
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

// Surah options for dropdowns
const surahOptions = computed(() => {
  return Object.entries(SURAH_NAMES).map(([num, name]) => ({
    value: Number(num),
    label: name
  }))
})

// Max verses for selected surahs
const maxStartVerse = computed(() => VERSE_COUNTS[startSurah.value] || 1)
const maxEndVerse = computed(() => VERSE_COUNTS[endSurah.value] || 1)

// Validate form before submit
function validate(): boolean {
  const result = isValidVerseRange(
    startSurah.value,
    startVerse.value,
    endSurah.value,
    endVerse.value
  )

  if (!result.valid) {
    validationError.value = result.error || 'خطأ في النطاق'
    return false
  }

  validationError.value = null
  return true
}

// Handle form submission
function handleSubmit() {
  if (!validate()) return

  const data: CreateAchievementDto = {
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
  }

  emit('submit', data)
  resetForm()
}

// Reset form after submission
function resetForm() {
  trackType.value = 'Hifz'
  startSurah.value = 1
  startVerse.value = 1
  endSurah.value = 1
  endVerse.value = 7
  mistakesCount.value = 0
  warningsCount.value = 0
  tajweedErrorsCount.value = 0
  teacherNotes.value = ''
  validationError.value = null
}

// Counter helpers
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
</script>

<template>
  <div
    class="rounded-2xl p-5"
    style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);"
  >
    <!-- Header -->
    <div class="mb-5">
      <p class="title-lg font-arabic font-semibold" style="color: var(--color-on-surface);">
        تسجيل إنجاز جديد
      </p>
      <p class="body-sm font-arabic mt-1" style="color: var(--color-on-surface-variant);">
        {{ student.name }}
      </p>
    </div>

    <!-- Track type selector -->
    <div class="mb-5">
      <label class="label-md font-arabic block mb-2" style="color: var(--color-on-surface);">
        نوع المتابعة
      </label>
      <div class="flex gap-2">
        <button
          v-for="type in TRACK_TYPES"
          :key="type.value"
          class="flex-1 px-3 py-2 rounded-xl text-sm font-arabic font-semibold transition-colors"
          :style="trackType === type.value
            ? `background-color: ${type.color}; color: white;`
            : `background-color: ${type.bgColor}; color: ${type.color};`"
          @click="trackType = type.value as 'Hifz' | 'Near' | 'Far'"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Quran range -->
    <div class="mb-5">
      <label class="label-md font-arabic block mb-2" style="color: var(--color-on-surface);">
        نطاق الآيات
      </label>

      <!-- Start -->
      <div class="mb-3">
        <p class="label-sm font-arabic mb-2" style="color: var(--color-on-surface-variant);">من:</p>
        <div class="grid grid-cols-2 gap-2">
          <select
            v-model="startSurah"
            class="px-3 py-2 rounded-xl text-sm font-arabic outline-none"
            style="background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);"
          >
            <option v-for="opt in surahOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <input
            v-model.number="startVerse"
            type="number"
            min="1"
            :max="maxStartVerse"
            placeholder="رقم الآية"
            class="px-3 py-2 rounded-xl text-sm font-arabic outline-none"
            style="background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);"
          >
        </div>
      </div>

      <!-- End -->
      <div>
        <p class="label-sm font-arabic mb-2" style="color: var(--color-on-surface-variant);">إلى:</p>
        <div class="grid grid-cols-2 gap-2">
          <select
            v-model="endSurah"
            class="px-3 py-2 rounded-xl text-sm font-arabic outline-none"
            style="background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);"
          >
            <option v-for="opt in surahOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <input
            v-model.number="endVerse"
            type="number"
            min="1"
            :max="maxEndVerse"
            placeholder="رقم الآية"
            class="px-3 py-2 rounded-xl text-sm font-arabic outline-none"
            style="background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);"
          >
        </div>
      </div>

      <!-- Validation error -->
      <div
        v-if="validationError"
        class="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
        style="background-color: #FCE4EC;"
      >
        <UIcon name="i-lucide-alert-circle" class="w-4 h-4" style="color: #D81B60;" />
        <p class="label-sm font-arabic" style="color: #D81B60;">{{ validationError }}</p>
      </div>
    </div>

    <!-- Error counters -->
    <div class="mb-5">
      <label class="label-md font-arabic block mb-3" style="color: var(--color-on-surface);">
        عدد الأخطاء
      </label>

      <!-- Mistakes -->
      <div class="flex items-center justify-between mb-3 px-3 py-2 rounded-xl" style="background-color: var(--color-surface-container-low);">
        <span class="label-md font-arabic" style="color: var(--color-on-surface);">أخطاء الحفظ</span>
        <div class="flex items-center gap-2">
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style="background-color: var(--color-surface-container);"
            @click="decrement('mistakes')"
          >
            <UIcon name="i-lucide-minus" class="w-4 h-4" />
          </button>
          <span class="body-lg font-semibold w-8 text-center" style="color: var(--color-on-surface);">
            {{ mistakesCount }}
          </span>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style="background-color: var(--color-surface-container);"
            @click="increment('mistakes')"
          >
            <UIcon name="i-lucide-plus" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Warnings -->
      <div class="flex items-center justify-between mb-3 px-3 py-2 rounded-xl" style="background-color: var(--color-surface-container-low);">
        <span class="label-md font-arabic" style="color: var(--color-on-surface);">التنبيهات</span>
        <div class="flex items-center gap-2">
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style="background-color: var(--color-surface-container);"
            @click="decrement('warnings')"
          >
            <UIcon name="i-lucide-minus" class="w-4 h-4" />
          </button>
          <span class="body-lg font-semibold w-8 text-center" style="color: var(--color-on-surface);">
            {{ warningsCount }}
          </span>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style="background-color: var(--color-surface-container);"
            @click="increment('warnings')"
          >
            <UIcon name="i-lucide-plus" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Tajweed errors -->
      <div class="flex items-center justify-between px-3 py-2 rounded-xl" style="background-color: var(--color-surface-container-low);">
        <span class="label-md font-arabic" style="color: var(--color-on-surface);">أخطاء التجويد</span>
        <div class="flex items-center gap-2">
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style="background-color: var(--color-surface-container);"
            @click="decrement('tajweed')"
          >
            <UIcon name="i-lucide-minus" class="w-4 h-4" />
          </button>
          <span class="body-lg font-semibold w-8 text-center" style="color: var(--color-on-surface);">
            {{ tajweedErrorsCount }}
          </span>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style="background-color: var(--color-surface-container);"
            @click="increment('tajweed')"
          >
            <UIcon name="i-lucide-plus" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Teacher notes -->
    <div class="mb-5">
      <label class="label-md font-arabic block mb-2" style="color: var(--color-on-surface);">
        ملاحظات المعلم (اختياري)
      </label>
      <textarea
        v-model="teacherNotes"
        rows="3"
        placeholder="أضف ملاحظاتك هنا..."
        class="w-full resize-none rounded-xl p-3 text-sm font-arabic outline-none"
        style="background-color: var(--color-surface-container-low); color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);"
      />
    </div>

    <!-- Submit button -->
    <UButton
      block
      size="lg"
      icon="i-lucide-save"
      color="primary"
      @click="handleSubmit"
    >
      حفظ الإنجاز
    </UButton>
  </div>
</template>
