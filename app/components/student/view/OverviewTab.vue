<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { t, locale } = useI18n()

// The name is stored as four parts; the display `name` in the header is what the
// database derives from them, so show the breakdown here.
const nameParts = computed(() => [
  { labelKey: 'label.first_name', value: props.student.firstName },
  { labelKey: 'label.second_name', value: props.student.secondName },
  { labelKey: 'label.third_name', value: props.student.thirdName },
  { labelKey: 'label.family_name', value: props.student.familyName }
] as const)

const dailyTracks = computed(() => [
  { label: t('pages.students.card.dailyHifz'), value: props.student.dailyHifzPagesCapacity },
  { label: t('pages.students.card.dailyNear'), value: props.student.dailyNearPagesCapacity },
  { label: t('pages.students.card.dailyFar'), value: props.student.dailyFarPagesCapacity }
])

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' })
)

function formatDateOnly(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.value.format(d)
}

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
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <h3 class="font-semibold">
          {{ t('pages.students.viewModal.identityTitle') }}
        </h3>
      </template>
      <dl class="divide-y divide-default">
        <div
          v-for="part in nameParts"
          :key="part.labelKey"
          class="flex items-center justify-between gap-3 p-4 text-sm"
        >
          <dt class="text-muted">
            {{ t(part.labelKey) }}
          </dt>
          <dd class="font-medium">
            {{ part.value || '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 p-4 text-sm">
          <dt class="text-muted">
            {{ t('pages.students.viewModal.idNumber') }}
          </dt>
          <dd class="font-medium tabular-nums" dir="ltr">
            {{ student.idNumber ?? '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 p-4 text-sm">
          <dt class="text-muted">
            {{ t('pages.students.viewModal.gender') }}
          </dt>
          <dd class="font-medium">
            {{ student.gender === 'male' ? t('pages.students.viewModal.male') : t('pages.students.viewModal.female') }}
          </dd>
        </div>
        <div v-if="ageLabel" class="flex items-center justify-between gap-3 p-4 text-sm">
          <dt class="text-muted">
            {{ t('pages.students.viewModal.age') }}
          </dt>
          <dd class="font-medium">
            {{ ageLabel }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 p-4 text-sm">
          <dt class="text-muted">
            {{ t('pages.students.viewModal.dob') }}
          </dt>
          <dd class="font-medium">
            {{ formatDateOnly(student.dob) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 p-4 text-sm">
          <dt class="text-muted">
            {{ t('pages.students.viewModal.joinDate') }}
          </dt>
          <dd class="font-medium">
            {{ formatDateOnly(student.joinDate) }}
          </dd>
        </div>
      </dl>
    </UCard>

    <UCard v-if="student.notes">
      <template #header>
        <h3 class="font-semibold">
          {{ t('pages.students.viewModal.generalNotesTitle') }}
        </h3>
      </template>
      <p class="text-sm whitespace-pre-line">
        {{ student.notes }}
      </p>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-semibold">
          {{ t('pages.students.viewModal.dailyCapacityTitle') }}
        </h3>
      </template>
      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="(track, i) in dailyTracks"
          :key="i"
          class="rounded-lg border border-default p-4 text-center"
        >
          <p class="text-xs text-muted mb-1">
            {{ track.label }}
          </p>
          <p class="text-2xl font-semibold tabular-nums">
            {{ track.value }}
          </p>
          <p class="text-xs text-muted mt-1">
            {{ t('pages.students.card.pagesUnit') }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
