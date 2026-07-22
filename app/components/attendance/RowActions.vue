<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * Every per-row action for a student attendance row, in one place so the table
 * cell and the card header stay in step. The note button stays visible because
 * it is the one action teachers reach for constantly; the rest sit behind the
 * overflow menu.
 */
const props = defineProps<{
  studentId: string
  name: string
  notes: string
  /** False for roles that may read the roster but not record it (supervisors). */
  canEdit: boolean
}>()

const { t } = useI18n()
const { setNote, resetRow, isRowAtDefault } = useAttendance()

const items = computed<DropdownMenuItem[][]>(() => {
  const navigation: DropdownMenuItem[] = [
    {
      label: t('pages.attendance.rowActions.viewProfile'),
      icon: 'i-lucide-user',
      onSelect: () => navigateTo(`/students/${props.studentId}`)
    },
    {
      label: t('pages.attendance.rowActions.logAchievement'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(`/achievements?studentId=${props.studentId}`)
    }
  ]

  if (!props.canEdit) return [navigation]

  return [
    navigation,
    [
      {
        label: t('pages.attendance.rowActions.reset'),
        icon: 'i-lucide-rotate-ccw',
        // Nothing to undo when the row already carries the seeded defaults.
        disabled: isRowAtDefault(props.studentId),
        onSelect: () => resetRow(props.studentId)
      }
    ]
  ]
})
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <AttendanceNotePopover
      :name="name"
      :notes="notes"
      :disabled="!canEdit"
      @save="(v) => setNote(studentId, v)"
    />
    <UDropdownMenu :items="items" :content="{ align: 'end', collisionPadding: 12 }">
      <UButton
        icon="i-lucide-ellipsis-vertical"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        :aria-label="t('pages.attendance.rowActions.label')"
      />
    </UDropdownMenu>
  </div>
</template>
