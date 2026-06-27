<script setup lang="ts">
const props = defineProps<{
  studentId: string
  name: string
  notes: string
}>()

const { t } = useI18n()
const { setNote } = useAttendance()

const open = ref(false)
const local = ref(props.notes)
watch(() => props.notes, (v) => {
  local.value = v
})

function commit() {
  setNote(props.studentId, local.value)
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'w-80 p-4' }">
    <UButton
      :variant="notes ? 'soft' : 'ghost'"
      :color="notes ? 'primary' : 'neutral'"
      :icon="notes ? 'i-lucide-sticky-note' : 'i-lucide-message-square-plus'"
      size="sm"
      square
      :aria-label="t('pages.attendance.addNote')"
    />
    <template #content>
      <div class="flex flex-col gap-3">
        <p class="text-sm font-semibold">
          {{ t('pages.attendance.noteFor', { name }) }}
        </p>
        <UTextarea
          v-model="local"
          :rows="4"
          :placeholder="t('pages.attendance.noteEmpty')"
          autofocus
          class="w-full"
        />
        <div class="flex items-center justify-end gap-2">
          <UButton variant="ghost" color="neutral" size="sm" :label="t('common.cancel')" @click="open = false" />
          <UButton color="primary" size="sm" :label="t('pages.attendance.saveNote')" @click="commit" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
