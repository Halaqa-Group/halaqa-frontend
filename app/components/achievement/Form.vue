<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { SURAH_NAMES, TRACK_TYPES } from '~/data/constants'
import { isValidVerseRange, totalVersesInRange, VERSE_COUNTS } from '~/utils/quran'
import type { ApiAchievement, CreateAchievementDto, StudentWithAttendance } from '~/types'

const props = defineProps<{
  student: StudentWithAttendance
  halaqaId: number
  date: string
  editingAchievement?: ApiAchievement | null
  duplicateFrom?: ApiAchievement | null
}>()

const emit = defineEmits<{
  submit: [data: CreateAchievementDto]
  update: [id: number, data: CreateAchievementDto]
  cancelEdit: []
}>()

type TrackKey = 'Hifz' | 'Near' | 'Far'

type TrackColor = 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'neutral'

const TRACK_META: Record<TrackKey, { icon: string, color: TrackColor }> = {
  Hifz: { icon: 'i-lucide-book-open', color: 'primary' },
  Near: { icon: 'i-lucide-refresh-cw', color: 'error' },
  Far: { icon: 'i-lucide-library', color: 'warning' }
}

const trackType = ref<TrackKey>('Hifz')
const startSurah = ref(1)
const startVerse = ref(1)
const endSurah = ref(1)
const endVerse = ref(7)
const mistakesCount = ref(0)
const warningsCount = ref(0)
const tajweedScore = ref(0)
const teacherNotes = ref('')
const validationError = ref<string | null>(null)

const surahOptions = computed(() =>
  Object.entries(SURAH_NAMES).map(([num, name]) => ({ value: Number(num), label: name }))
)

const maxStartVerse = computed(() => VERSE_COUNTS[startSurah.value] || 1)
const maxEndVerse = computed(() => VERSE_COUNTS[endSurah.value] || 1)

const isEditing = computed(() => !!props.editingAchievement)

const rangeSummary = computed(() => {
  if (validationError.value) return null
  const total = totalVersesInRange(startSurah.value, startVerse.value, endSurah.value, endVerse.value)
  if (total <= 0) return null
  const startName = SURAH_NAMES[startSurah.value]
  const endName = SURAH_NAMES[endSurah.value]
  if (startSurah.value === endSurah.value) {
    return `${startName}: من الآية ${startVerse.value} إلى ${endVerse.value} (${total} آيات)`
  }
  return `${startName} ${startVerse.value} ← ${endName} ${endVerse.value} (${total} آيات)`
})

function validate(): boolean {
  const result = isValidVerseRange(startSurah.value, startVerse.value, endSurah.value, endVerse.value)
  if (!result.valid) { validationError.value = result.error || 'خطأ في النطاق'; return false }
  validationError.value = null
  return true
}

watch([startSurah, startVerse, endSurah, endVerse], () => {
  const result = isValidVerseRange(startSurah.value, startVerse.value, endSurah.value, endVerse.value)
  validationError.value = result.valid ? null : (result.error || null)
})

function buildDto(): CreateAchievementDto {
  return {
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
    tajweed_errors_count: tajweedScore.value,
    teacher_notes: teacherNotes.value || undefined
  }
}

function handleSubmit() {
  if (!validate()) return
  const dto = buildDto()
  if (isEditing.value && props.editingAchievement) {
    emit('update', props.editingAchievement.id, dto)
  } else {
    emit('submit', dto)
    resetForm()
  }
}

function handleCancelEdit() {
  emit('cancelEdit')
  resetForm()
}

function resetForm() {
  trackType.value = 'Hifz'
  startSurah.value = 1; startVerse.value = 1
  endSurah.value = 1; endVerse.value = 7
  mistakesCount.value = 0; warningsCount.value = 0; tajweedScore.value = 0
  teacherNotes.value = ''; validationError.value = null
}

function loadFromAchievement(a: ApiAchievement) {
  trackType.value = a.track_type
  startSurah.value = a.start_surah
  startVerse.value = a.start_verse
  endSurah.value = a.end_surah
  endVerse.value = a.end_verse
  mistakesCount.value = a.mistakes_count
  warningsCount.value = a.warnings_count
  tajweedScore.value = Math.min(10, a.tajweed_errors_count)
  teacherNotes.value = a.teacher_notes || ''
  validationError.value = null
}

watch(() => props.editingAchievement, (a) => {
  if (a) loadFromAchievement(a)
  else resetForm()
})

watch(() => props.duplicateFrom, (a) => {
  if (a) {
    trackType.value = a.track_type
    startSurah.value = a.start_surah
    startVerse.value = a.start_verse
    endSurah.value = a.end_surah
    endVerse.value = a.end_verse
    mistakesCount.value = 0
    warningsCount.value = 0
    tajweedScore.value = 0
    teacherNotes.value = ''
    validationError.value = null
  }
})

function increment(field: 'mistakes' | 'warnings' | 'tajweed') {
  if (field === 'mistakes') mistakesCount.value++
  else if (field === 'warnings') warningsCount.value++
  else if (field === 'tajweed' && tajweedScore.value < 10) tajweedScore.value++
}

function decrement(field: 'mistakes' | 'warnings' | 'tajweed') {
  if (field === 'mistakes' && mistakesCount.value > 0) mistakesCount.value--
  else if (field === 'warnings' && warningsCount.value > 0) warningsCount.value--
  else if (field === 'tajweed' && tajweedScore.value > 0) tajweedScore.value--
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleSubmit()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown)
})

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
  <div class="rounded-2xl overflow-hidden ring ring-card-border bg-surface-container-lowest shadow-card">
    <!-- Header -->
    <div class="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-outline-variant">
      <img :src="student.avatar" class="w-10 h-10 rounded-full object-cover shrink-0" :alt="student.name">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold uppercase tracking-widest mb-0.5 text-primary">
          {{ isEditing ? 'تعديل إنجاز' : 'تسجيل إنجاز' }}
        </p>
        <p class="text-xl font-bold truncate leading-tight text-on-surface">
          {{ student.name }}
        </p>
      </div>
      <UButton
        v-if="isEditing"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        size="sm"
        class="shrink-0 rounded-full"
        :aria-label="'إلغاء التعديل'"
        @click="handleCancelEdit"
      />
    </div>

    <div class="px-6 pt-5 pb-6 flex flex-col gap-5">
      <!-- Track type tabs -->
      <div class="grid grid-cols-3 gap-2">
        <UButton
          v-for="type in TRACK_TYPES"
          :key="type.value"
          :color="TRACK_META[type.value as TrackKey].color"
          :variant="trackType === type.value ? 'solid' : 'outline'"
          :icon="TRACK_META[type.value as TrackKey].icon"
          :label="type.label"
          size="md"
          block
          class="rounded-xl font-semibold py-2.5"
          @click="trackType = type.value as TrackKey"
        />
      </div>

      <!-- Range -->
      <div class="rounded-2xl p-4 flex flex-col gap-3 bg-surface-container-low">
        <div class="flex gap-2 items-end">
          <UFormField label="من — السورة" class="flex-[3]" :ui="labelUi">
            <USelect
              v-model="startSurah"
              :items="surahOptions"
              variant="none"
              class="w-full"
              :ui="fieldUi"
            />
          </UFormField>
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
          <div class="pb-2.5 px-0.5">
            <LucideArrowLeftRight class="w-3.5 h-3.5 text-outline" />
          </div>
          <UFormField label="إلى — السورة" class="flex-[3]" :ui="labelUi">
            <USelect
              v-model="endSurah"
              :items="surahOptions"
              variant="none"
              class="w-full"
              :ui="fieldUi"
            />
          </UFormField>
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

        <!-- Live summary -->
        <div
          v-if="rangeSummary"
          class="px-3 py-2 rounded-lg flex items-center gap-2 bg-primary-container"
        >
          <LucideBookMarked class="w-4 h-4 shrink-0 text-primary" />
          <p class="text-xs font-medium text-primary">
            {{ rangeSummary }}
          </p>
        </div>

        <!-- Validation error -->
        <div
          v-if="validationError"
          class="px-3 py-2 rounded-lg flex items-center gap-2 bg-track-near-bg"
        >
          <LucideAlertCircle class="w-4 h-4 shrink-0 text-track-near" />
          <p class="text-xs text-track-near">
            {{ validationError }}
          </p>
        </div>
      </div>

      <!-- Themed counters -->
      <div class="grid grid-cols-3 gap-3">
        <!-- Mistakes — red -->
        <div class="rounded-2xl p-4 flex flex-col items-center gap-3 bg-track-near-bg">
          <span class="text-[10px] font-bold uppercase tracking-wider text-track-near">أخطاء</span>
          <span
            :key="`m-${mistakesCount}`"
            class="text-3xl font-bold counter-pop text-track-near"
          >{{ mistakesCount }}</span>
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              icon="i-lucide-minus"
              class="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full justify-center hover:scale-105 active:scale-95 bg-track-near/15 text-track-near"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="decrement('mistakes')"
            />
            <UButton
              variant="ghost"
              icon="i-lucide-plus"
              class="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full justify-center hover:scale-105 active:scale-95 bg-track-near/15 text-track-near"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="increment('mistakes')"
            />
          </div>
        </div>

        <!-- Warnings — orange -->
        <div class="rounded-2xl p-4 flex flex-col items-center gap-3 bg-status-warning-bg">
          <span class="text-[10px] font-bold uppercase tracking-wider text-status-warning">تنبيهات</span>
          <span
            :key="`w-${warningsCount}`"
            class="text-3xl font-bold counter-pop text-status-warning"
          >{{ warningsCount }}</span>
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              icon="i-lucide-minus"
              class="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full justify-center hover:scale-105 active:scale-95 bg-status-warning/15 text-status-warning"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="decrement('warnings')"
            />
            <UButton
              variant="ghost"
              icon="i-lucide-plus"
              class="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full justify-center hover:scale-105 active:scale-95 bg-status-warning/15 text-status-warning"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              @click="increment('warnings')"
            />
          </div>
        </div>

        <!-- Tajweed — green, 0..10 -->
        <div class="rounded-2xl p-4 flex flex-col items-center gap-3 bg-status-ok-bg">
          <span class="text-[10px] font-bold uppercase tracking-wider text-status-ok">تجويد</span>
          <span
            :key="`t-${tajweedScore}`"
            class="text-3xl font-bold counter-pop text-status-ok"
          >
            {{ tajweedScore }}<span class="text-base font-normal opacity-70">/10</span>
          </span>
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              icon="i-lucide-minus"
              class="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full justify-center hover:scale-105 active:scale-95 disabled:opacity-40 bg-status-ok/15 text-status-ok"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              :disabled="tajweedScore <= 0"
              @click="decrement('tajweed')"
            />
            <UButton
              variant="ghost"
              icon="i-lucide-plus"
              class="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full justify-center hover:scale-105 active:scale-95 disabled:opacity-40 bg-status-ok/15 text-status-ok"
              :ui="{ leadingIcon: 'w-4 h-4' }"
              :disabled="tajweedScore >= 10"
              @click="increment('tajweed')"
            />
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-bold uppercase tracking-wider px-1 text-on-surface-variant">
          ملاحظات المعلم
        </label>
        <UTextarea
          v-model="teacherNotes"
          :rows="3"
          placeholder="أضف ملاحظاتك على أداء الطالب... (اختياري)"
          variant="none"
          class="w-full"
          :ui="{
            base: 'w-full resize-none rounded-xl px-4 py-3 text-sm bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/30 min-h-[80px]'
          }"
        />
      </div>

      <!-- Submit + cancel -->
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <UButton
            v-if="isEditing"
            variant="soft"
            color="neutral"
            label="إلغاء"
            size="lg"
            class="px-5 py-3 rounded-full"
            @click="handleCancelEdit"
          />
          <UButton
            variant="solid"
            color="primary"
            :icon="isEditing ? 'i-lucide-check' : 'i-lucide-save'"
            :label="isEditing ? 'تحديث الإنجاز' : 'حفظ الإنجاز'"
            block
            size="lg"
            class="flex-1 py-3 rounded-full text-base hover:opacity-90 active:scale-[0.98] transition-transform shadow-lg shadow-primary/30"
            :ui="{ leadingIcon: 'w-5 h-5' }"
            @click="handleSubmit"
          />
        </div>
        <p class="text-[11px] text-center text-on-surface-variant">
          أو اضغط
          <kbd class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container text-on-surface">Ctrl</kbd>
          +
          <kbd class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container text-on-surface">Enter</kbd>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.counter-pop {
  display: inline-block;
  animation: counter-pop 0.18s ease-out;
}
@keyframes counter-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
</style>
