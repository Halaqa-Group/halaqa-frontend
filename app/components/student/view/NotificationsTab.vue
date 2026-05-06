<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { locale } = useI18n()
const { studentNotes, openNotifyParent } = useStudents()

const dateTimeFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
)

const notes = computed(() => studentNotes.value[props.student.id] ?? [])

function formatNoteDate(iso: string) {
  return dateTimeFormatter.value.format(new Date(iso))
}

function handleNotifyClick() {
  openNotifyParent(props.student)
}
</script>

<template>
  <div class="flex flex-col gap-6 pt-6">
    <div class="rounded-xl p-5 border border-outline-variant">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h4 class="body-lg font-bold flex items-center gap-2 text-on-surface">
          <UIcon name="i-lucide-bell" class="w-5 h-5 text-secondary" />
          {{ $t('pages.students.notesList.title') }}
        </h4>
        <UButton
          size="sm"
          icon="i-lucide-plus"
          class="rounded-full"
          @click="handleNotifyClick"
        >
          {{ $t('pages.students.notesList.addNew') }}
        </UButton>
      </div>

      <div
        v-if="notes.length === 0"
        class="text-center py-6 body-md text-on-surface-variant"
      >
        {{ $t('pages.students.notesList.empty') }}
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="note in notes"
          :key="note.id"
          class="p-4 rounded-lg bg-surface-container-low"
        >
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-user" class="w-4 h-4 shrink-0 text-muted" />
              <span class="body-md font-medium truncate text-on-surface">
                {{ note.authorName }}
              </span>
            </div>
            <span class="label-md shrink-0 text-muted">
              {{ formatNoteDate(note.createdAt) }}
            </span>
          </div>
          <p class="body-md whitespace-pre-line text-on-surface">
            {{ note.message }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>
