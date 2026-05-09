<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()
const { openEdit, openNotifyParent } = useStudents()

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

const statusBadgeClass = computed(() => {
  const s = props.student.status
  if (s === 'active') return 'bg-secondary text-on-secondary'
  if (s === 'graduated') return 'bg-primary text-on-primary'
  return 'bg-outline text-white'
})

const genderLabel = computed(() => {
  const g = props.student.gender
  if (g === 'male') return t('pages.students.viewModal.male')
  if (g === 'female') return t('pages.students.viewModal.female')
  return ''
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

function handleNotifyClick() {
  openNotifyParent(props.student)
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
  <div class="w-full lg:w-1/3 shrink-0 flex flex-col items-center text-center p-8 gap-6 border-e border-outline-variant bg-surface-container-low">
    <div class="relative">
      <img
        :src="student.avatar"
        :alt="student.name"
        class="w-32 h-32 rounded-full object-cover border-4 border-surface-container-lowest"
        style="box-shadow: 0 2px 12px rgba(128,76,125,0.12);"
      >
      <span
        class="absolute bottom-2 end-0 px-3 py-1 rounded-full text-xs font-bold"
        :class="statusBadgeClass"
      >{{ statusLabel }}</span>
    </div>

    <div class="space-y-1">
      <h2 class="display-md text-on-surface">
        {{ student.name }}
      </h2>
      <p class="body-md text-on-surface-variant">
        {{ student.halaqat.length > 0 ? student.halaqat.join('، ') : '—' }}
      </p>
    </div>

    <div class="w-full rounded-xl p-4 space-y-3 bg-surface-container-lowest shadow-sm text-start">
      <div v-if="genderLabel" class="flex justify-between items-center gap-3">
        <span class="body-md text-on-surface-variant">
          {{ $t('pages.students.viewModal.gender') }}
        </span>
        <span class="body-md font-medium text-on-surface">{{ genderLabel }}</span>
      </div>
      <div v-if="ageLabel" class="flex justify-between items-center gap-3">
        <span class="body-md text-on-surface-variant">
          {{ $t('pages.students.viewModal.age') }}
        </span>
        <span class="body-md font-medium text-on-surface">{{ ageLabel }}</span>
      </div>
      <div class="flex justify-between items-center gap-3">
        <span class="body-md text-on-surface-variant">
          {{ $t('pages.students.viewModal.joinDate') }}
        </span>
        <span class="body-md font-medium text-on-surface">{{ joinDateLabel }}</span>
      </div>
      <div class="flex justify-between items-center gap-3 pt-3 border-t border-outline-variant">
        <span class="body-md text-on-surface-variant">
          {{ $t('pages.students.viewModal.guardiansCount') }}
        </span>
        <span class="body-lg font-bold text-primary">{{ student.guardians.length }}</span>
      </div>
    </div>

    <div class="w-full flex flex-col gap-3 mt-auto">
      <UButton
        block
        color="primary"
        icon="i-lucide-file-edit"
        :label="$t('pages.students.viewModal.editProfile')"
        class="rounded-full"
        @click="handleEditClick"
      />
      <UButton
        block
        variant="outline"
        color="primary"
        icon="i-lucide-bell"
        :label="$t('pages.students.viewModal.notifyParent')"
        class="rounded-full"
        @click="handleNotifyClick"
      />
      <div class="grid grid-cols-2 gap-2">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-book-open"
          size="sm"
          class="rounded-full justify-center"
          @click="handleLogAchievement"
        >
          {{ $t('pages.students.actions.logAchievement') }}
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-check"
          size="sm"
          class="rounded-full justify-center"
          @click="handleRecordAttendance"
        >
          {{ $t('pages.students.actions.recordAttendance') }}
        </UButton>
      </div>
      <UButton
        variant="ghost"
        color="neutral"
        block
        :label="$t('pages.students.viewModal.close')"
        class="w-full py-2 body-md hover:opacity-70 font-normal text-muted"
        @click="emit('close')"
      />
    </div>
  </div>
</template>
