<script setup lang="ts">
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()
const { deleteStudent } = useStudents()

const isOpen = ref(true)
const loading = ref(false)

watch(isOpen, (v) => { if (!v && !loading.value) emit('close') })

async function onConfirm() {
  if (loading.value) return
  loading.value = true
  try {
    await deleteStudent(props.student.id)
    toast.add({ title: t('pages.students.actions.deleteSuccess'), color: 'success' })
    isOpen.value = false
    emit('close')
  } catch (e: any) {
    const raw = e?.data?.message
    const message = Array.isArray(raw) ? raw.join('، ') : (raw || t('pages.students.actions.deleteError'))
    toast.add({ title: message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ConfirmDialog
    v-model:open="isOpen"
    :title="t('pages.students.actions.deleteConfirmTitle')"
    :message="t('pages.students.actions.deleteConfirmMessage', { name: student.name })"
    :confirm-label="t('pages.students.actions.deleteConfirm')"
    destructive
    :loading="loading"
    @confirm="onConfirm"
  />
</template>
