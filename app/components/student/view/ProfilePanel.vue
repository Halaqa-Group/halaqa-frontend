<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()
const { canEditStudent: canEdit } = usePermissions()
const { openEdit } = useStudents()

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' })
)

const statusLabel = computed(() => {
  const s = props.student.status
  if (s === 'active') return t('pages.students.statusActive')
  if (s === 'inactive') return t('pages.students.statusInactive')
  if (s === 'graduated') return t('pages.students.statusGraduated')
  return ''
})

const statusColor = computed<'success' | 'warning' | 'info' | 'error'>(() => {
  if (props.student.deletedAt) return 'error'
  if (props.student.status === 'active') return 'success'
  if (props.student.status === 'inactive') return 'warning'
  return 'info'
})

const ageLabel = computed(() => {
  const dob = props.student.dob
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  const dayDiff = now.getDate() - birth.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1
  if (years < 0) return null
  return t('pages.students.viewModal.ageYears', { count: years })
})

const joinDateLabel = computed(() => {
  const iso = props.student.joinDate
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.value.format(d)
})

function handleEditClick() {
  emit('close')
  openEdit(props.student)
}

async function handleLogAchievement() {
  const id = props.student.id
  emit('close')
  await navigateTo(`/achievements?studentId=${id}`)
}

async function handleRecordAttendance() {
  const id = props.student.id
  emit('close')
  await navigateTo(`/attendance?studentId=${id}`)
}
</script>

<template>
  <UCard
    class="w-full lg:w-72 shrink-0"
    :ui="{ body: 'p-5' }"
  >
    <div class="flex flex-col items-center text-center gap-4">
      <img
        :src="student.avatar"
        :alt="student.name"
        class="w-24 h-24 rounded-full object-cover border border-default"
      >

      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ student.name }}
        </h2>
        <p v-if="student.idNumber" class="text-xs text-muted tabular-nums" dir="ltr">
          {{ student.idNumber }}
        </p>
        <UBadge variant="subtle" :color="statusColor" :label="statusLabel" />
      </div>

      <div class="w-full text-sm space-y-2 pt-2 border-t border-default">
        <div class="flex justify-between items-center gap-3">
          <span class="text-muted">{{ t('pages.students.viewModal.gender') }}</span>
          <span class="font-medium">
            {{ student.gender === 'male' ? t('pages.students.viewModal.male') : t('pages.students.viewModal.female') }}
          </span>
        </div>
        <div v-if="ageLabel" class="flex justify-between items-center gap-3">
          <span class="text-muted">{{ t('pages.students.viewModal.age') }}</span>
          <span class="font-medium">{{ ageLabel }}</span>
        </div>
        <div class="flex justify-between items-center gap-3">
          <span class="text-muted">{{ t('pages.students.viewModal.joinDate') }}</span>
          <span class="font-medium">{{ joinDateLabel }}</span>
        </div>
        <div class="flex justify-between items-center gap-3">
          <span class="text-muted">{{ t('pages.students.viewModal.guardiansCount') }}</span>
          <span class="font-semibold text-primary">{{ student.guardians.length }}</span>
        </div>
      </div>

      <div class="w-full flex flex-col gap-2 pt-2">
        <UButton
          v-if="canEdit"
          block
          icon="i-lucide-pencil"
          @click="handleEditClick"
        >
          {{ t('pages.students.viewModal.editProfile') }}
        </UButton>
        <UButton
          block
          variant="soft"
          color="neutral"
          icon="i-lucide-book-open"
          @click="handleLogAchievement"
        >
          {{ t('pages.students.actions.logAchievement') }}
        </UButton>
        <UButton
          block
          variant="soft"
          color="neutral"
          icon="i-lucide-check"
          @click="handleRecordAttendance"
        >
          {{ t('pages.students.actions.recordAttendance') }}
        </UButton>
      </div>
    </div>
  </UCard>
</template>
