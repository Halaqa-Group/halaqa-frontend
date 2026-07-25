<script setup lang="ts">
import { isValidVerseRange } from '~/utils/quran'
import type { PlanDirection, VerseRange } from '~/utils/quran-structure'

// One session's range, edited in place. There's no confirm step: every change is
// written straight back to the plan draft (which the planner saves as a whole), so
// a teacher can retune any session in the cell without leaving the list.
const props = withDefaults(defineProps<{
  range: VerseRange
  // The student's memorization direction. Walking the mushaf backwards, a surah
  // picked as the session's end lands on its last ayah instead of its first.
  direction?: PlanDirection
}>(), { direction: 'asc' })
const emit = defineEmits<{ update: [VerseRange] }>()

const { t } = useI18n()

const form = reactive<VerseRange>({ ...props.range })

function sameRange(a: VerseRange, b: VerseRange): boolean {
  return a.start_surah === b.start_surah && a.start_verse === b.start_verse
    && a.end_surah === b.end_surah && a.end_verse === b.end_verse
}

// Keep in step with the draft when it changes from the outside (a paste, a drag,
// a reload) without echoing our own writes back into the pickers.
watch(() => props.range, (r) => {
  if (!sameRange(form, r)) Object.assign(form, r)
}, { deep: true })

const validity = computed(() => isValidVerseRange(form.start_surah, form.start_verse, form.end_surah, form.end_verse))

// An in-between state — the end still behind the start while the teacher is
// picking — is shown as an error but never committed, so the draft only ever holds
// a valid range.
watch(form, () => {
  if (validity.value.valid && !sameRange(form, props.range)) emit('update', { ...form })
})
</script>

<template>
  <div class="space-y-2">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div class="space-y-1">
        <span class="text-[11px] font-medium text-muted">{{ t('pages.planner.cell.startLabel') }}</span>
        <PlannerAyahSelect v-model:surah="form.start_surah" v-model:verse="form.start_verse" />
      </div>
      <div class="space-y-1">
        <span class="text-[11px] font-medium text-muted">{{ t('pages.planner.cell.endLabel') }}</span>
        <PlannerAyahSelect
          v-model:surah="form.end_surah"
          v-model:verse="form.end_verse"
          :snap-to="direction === 'desc' ? 'last' : 'first'"
        />
      </div>
    </div>
    <p v-if="!validity.valid" class="text-xs text-error">
      {{ validity.error }}
    </p>
  </div>
</template>
