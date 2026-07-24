<script setup lang="ts">
/**
 * The teacher's daily note (ملاحظة المحفّظ اليومية) for a student — distinct from
 * the excuse note. It feeds the daily report's `teacher_note`.
 *
 * Backend constraints worth knowing: the note is saved through the single-row
 * attendance-correction endpoint (which needs a saved row + a modification
 * reason), and the attendance list does not return it yet — so it can only be
 * edited once the day's attendance exists, and it resets to empty on reload.
 */
const props = defineProps<{
  studentId: string
  name: string
  dailyNote: string
  disabled?: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { hasSavedRecord, saveDailyNote } = useAttendance()

const open = ref(false)
const local = ref(props.dailyNote)
const saving = ref(false)

watch(() => props.dailyNote, (v) => {
  local.value = v
})

// Can only save once the day's attendance row exists (see component doc).
const canSave = computed(() => hasSavedRecord(props.studentId))

async function commit() {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    await saveDailyNote(props.studentId, local.value.trim())
    toast.add({ title: t('pages.attendance.dailyNote.savedToast'), color: 'success' })
    open.value = false
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.attendance.dailyNote.errorToast')), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'w-80 p-4' }">
    <UButton
      :variant="dailyNote ? 'soft' : 'ghost'"
      :color="dailyNote ? 'primary' : 'neutral'"
      icon="i-lucide-clipboard-pen"
      size="sm"
      square
      :disabled="disabled"
      :aria-label="t('pages.attendance.dailyNote.label')"
    />
    <template #content>
      <div class="flex flex-col gap-3">
        <div>
          <p class="text-sm font-semibold">
            {{ t('pages.attendance.dailyNote.title', { name }) }}
          </p>
          <p class="text-xs text-muted mt-0.5">
            {{ t('pages.attendance.dailyNote.hint') }}
          </p>
        </div>
        <UTextarea
          v-model="local"
          :rows="4"
          :placeholder="t('pages.attendance.dailyNote.placeholder')"
          :disabled="!canSave || saving"
          autofocus
          class="w-full"
        />
        <p v-if="!canSave" class="text-xs text-warning">
          {{ t('pages.attendance.dailyNote.needsRecord') }}
        </p>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="ghost" color="neutral" size="sm" :disabled="saving" :label="t('common.cancel')" @click="open = false" />
          <UButton color="primary" size="sm" :loading="saving" :disabled="!canSave" :label="t('common.save')" @click="commit" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
