<script setup lang="ts">
import type { Student } from '~/types'
import type { MemorizedRange } from '~/utils/memorization'
import { TOTAL_AYAT } from '~/utils/memorization'
import { SURAH_NAMES } from '~/data/constants'
import { formatVerseRange, isValidVerseRange } from '~/utils/quran'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const toast = useToast()
const { canEditMemorization: canEdit } = usePermissions()

const {
  count, percentage, ranges, loading, saving, error, load, edit
} = useStudentMemorization(() => props.student.id)

onMounted(load)

// ── Mushaf preview: expand a memorized range onto the page ──────────────────────
const previewRange = ref<MemorizedRange | null>(null)
function togglePreview(r: MemorizedRange) {
  const p = previewRange.value
  previewRange.value = p && sameRange(p, r) ? null : r
}
function sameRange(a: MemorizedRange, b: MemorizedRange): boolean {
  return a.startSurah === b.startSurah && a.startVerse === b.startVerse
    && a.endSurah === b.endSurah && a.endVerse === b.endVerse
}

// ── Manual edit ────────────────────────────────────────────────────────────────
const mode = ref<'set' | 'clear'>('set')
const modeItems = computed(() => [
  { value: 'set', label: t('pages.students.viewModal.memorization.markMemorized') },
  { value: 'clear', label: t('pages.students.viewModal.memorization.unmark') }
])
const form = reactive({ startSurah: 1, startVerse: 1, endSurah: 1, endVerse: 7 })

const validation = computed(() =>
  isValidVerseRange(form.startSurah, form.startVerse, form.endSurah, form.endVerse)
)

async function submit() {
  if (!validation.value.valid) return
  const range = {
    start_surah: form.startSurah,
    start_verse: form.startVerse,
    end_surah: form.endSurah,
    end_verse: form.endVerse
  }
  const body = mode.value === 'set' ? { set: [range] } : { clear: [range] }
  const ok = await edit(body)
  if (ok) {
    toast.add({ title: t('pages.students.viewModal.memorization.saved'), color: 'success' })
    previewRange.value = null
  } else {
    toast.add({ title: error.value ?? t('pages.students.viewModal.memorization.saveFailed'), color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="loading" class="py-10 text-center text-muted text-sm">
      {{ t('common.loading') }}
    </div>

    <template v-else>
      <!-- Progress summary -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('pages.students.viewModal.memorization.progressTitle') }}
          </h3>
        </template>
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="text-3xl font-semibold tabular-nums">
              {{ count.toLocaleString() }}
              <span class="text-base text-muted">/ {{ TOTAL_AYAT.toLocaleString() }}</span>
            </p>
            <p class="text-xs text-muted mt-1">
              {{ t('pages.students.viewModal.memorization.ayatUnit') }}
            </p>
          </div>
          <p class="text-2xl font-semibold text-primary tabular-nums">
            {{ percentage }}%
          </p>
        </div>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full rounded-full bg-primary transition-all"
            :style="{ width: `${Math.min(percentage, 100)}%` }"
          />
        </div>
      </UCard>

      <!-- Memorized ranges -->
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <h3 class="font-semibold">
            {{ t('pages.students.viewModal.memorization.rangesTitle') }}
          </h3>
        </template>

        <p v-if="!ranges.length" class="p-4 text-sm text-muted">
          {{ t('pages.students.viewModal.memorization.none') }}
        </p>

        <ul v-else class="divide-y divide-default">
          <li v-for="(r, i) in ranges" :key="i">
            <div class="flex items-center justify-between gap-3 p-4 text-sm">
              <span class="font-medium">
                {{ formatVerseRange(r.startSurah, r.startVerse, r.endSurah, r.endVerse, SURAH_NAMES) }}
              </span>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="previewRange && sameRange(previewRange, r) ? 'i-lucide-chevron-up' : 'i-lucide-book-open'"
                @click="togglePreview(r)"
              >
                {{ t('pages.students.viewModal.memorization.view') }}
              </UButton>
            </div>
            <div v-if="previewRange && sameRange(previewRange, r)" class="border-t border-default bg-elevated/40 p-3">
              <MushafRangeViewer
                :start-surah="r.startSurah"
                :start-verse="r.startVerse"
                :end-surah="r.endSurah"
                :end-verse="r.endVerse"
              />
            </div>
          </li>
        </ul>
      </UCard>

      <!-- Manual edit (editors only) -->
      <UCard v-if="canEdit">
        <template #header>
          <h3 class="font-semibold">
            {{ t('pages.students.viewModal.memorization.editTitle') }}
          </h3>
        </template>

        <div class="flex flex-col gap-3">
          <UTabs
            v-model="mode"
            :items="modeItems"
            :content="false"
            size="sm"
          />

          <div class="flex flex-col gap-2">
            <label class="text-xs text-muted">{{ t('pages.students.viewModal.memorization.from') }}</label>
            <PlannerAyahSelect v-model:surah="form.startSurah" v-model:verse="form.startVerse" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-xs text-muted">{{ t('pages.students.viewModal.memorization.to') }}</label>
            <PlannerAyahSelect v-model:surah="form.endSurah" v-model:verse="form.endVerse" />
          </div>

          <p v-if="!validation.valid" class="text-xs text-error">
            {{ validation.error }}
          </p>

          <p class="text-xs text-muted">
            {{ t('pages.students.viewModal.memorization.recomputeHint') }}
          </p>

          <div class="flex justify-end">
            <UButton
              :color="mode === 'clear' ? 'error' : 'primary'"
              :loading="saving"
              :disabled="!validation.valid"
              @click="submit"
            >
              {{ mode === 'set'
                ? t('pages.students.viewModal.memorization.markMemorized')
                : t('pages.students.viewModal.memorization.unmark') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
