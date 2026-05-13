<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const { user } = useAuth()
const {
  openView,
  openEdit,
  requestDelete,
  requestGraduate,
  requestRestore
} = useStudents()

const isDeleted = computed(() => !!props.student.deletedAt)
const statusLabel = computed(() => {
  if (isDeleted.value) return t('pages.students.statusDeleted')
  if (props.student.status === 'active') return t('pages.students.statusActive')
  if (props.student.status === 'inactive') return t('pages.students.statusInactive')
  return t('pages.students.statusGraduated')
})
const statusColor = computed<'success' | 'warning' | 'info' | 'error'>(() => {
  if (isDeleted.value) return 'error'
  if (props.student.status === 'active') return 'success'
  if (props.student.status === 'inactive') return 'warning'
  return 'info'
})

const primaryGuardian = computed(() => props.student.guardians.find(g => g.is_primary) ?? null)

const isPrincipalOrVP = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('principal') || roles.includes('vice_principal')
})

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const primary: DropdownMenuItem[] = [
    {
      label: t('pages.students.actions.viewProfile'),
      icon: 'i-lucide-eye',
      onSelect: () => openView(props.student)
    },
    {
      label: t('pages.students.actions.logAchievement'),
      icon: 'i-lucide-book-open',
      onSelect: () => navigateTo(`/achievements?studentId=${props.student.id}`)
    },
    {
      label: t('pages.students.actions.recordAttendance'),
      icon: 'i-lucide-check',
      onSelect: () => navigateTo(`/attendance?studentId=${props.student.id}`)
    },
    {
      label: t('pages.students.actions.editStudent'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(props.student)
    }
  ]
  if (!isPrincipalOrVP.value) return [primary]
  const lifecycle: DropdownMenuItem[] = []
  if (isDeleted.value) {
    lifecycle.push({
      label: t('pages.students.actions.restore'),
      icon: 'i-lucide-rotate-ccw',
      onSelect: () => requestRestore(props.student)
    })
  } else {
    if (props.student.status !== 'graduated') {
      lifecycle.push({
        label: t('pages.students.actions.graduate'),
        icon: 'i-lucide-graduation-cap',
        onSelect: () => requestGraduate(props.student)
      })
    }
    lifecycle.push({
      label: t('pages.students.actions.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => requestDelete(props.student)
    })
  }
  return [primary, lifecycle]
})
</script>

<template>
  <UCard
    class="transition-colors hover:border-primary/40"
    :ui="{ body: 'p-5' }"
  >
    <div class="flex items-start justify-between gap-3 mb-4">
      <button
        type="button"
        class="flex items-center gap-3 min-w-0 text-start hover:opacity-80"
        @click="openView(student)"
      >
        <img
          :src="student.avatar"
          :alt="student.name"
          class="w-12 h-12 rounded-full object-cover border border-default shrink-0"
        >
        <div class="flex flex-col min-w-0">
          <span class="font-semibold truncate">{{ student.name }}</span>
          <span v-if="student.idNumber" class="text-xs text-muted tabular-nums" dir="ltr">
            {{ student.idNumber }}
          </span>
        </div>
      </button>

      <div class="flex items-center gap-1 shrink-0">
        <UBadge variant="subtle" :color="statusColor" :label="statusLabel" />
        <UDropdownMenu
          :items="menuItems"
          :content="{ align: 'end', collisionPadding: 12 }"
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
            square
          />
        </UDropdownMenu>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2 text-sm mb-4">
      <div class="flex flex-col">
        <span class="text-xs text-muted">{{ t('pages.students.card.dailyHifz') }}</span>
        <span class="tabular-nums font-medium">
          {{ student.dailyHifzPagesCapacity }}
        </span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-muted">{{ t('pages.students.card.dailyNear') }}</span>
        <span class="tabular-nums font-medium">
          {{ student.dailyNearPagesCapacity }}
        </span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-muted">{{ t('pages.students.card.dailyFar') }}</span>
        <span class="tabular-nums font-medium">
          {{ student.dailyFarPagesCapacity }}
        </span>
      </div>
    </div>

    <div v-if="primaryGuardian" class="rounded-md border border-default p-3 mb-4">
      <p class="text-xs text-muted mb-1">
        {{ t('pages.students.card.primaryGuardian') }}
      </p>
      <div class="flex items-center justify-between gap-2 text-sm">
        <span class="font-medium truncate">{{ primaryGuardian.user.name }}</span>
        <a
          v-if="primaryGuardian.user.phone"
          :href="`tel:${primaryGuardian.user.phone}`"
          class="text-primary hover:underline shrink-0"
          dir="ltr"
        >{{ primaryGuardian.user.phone }}</a>
      </div>
    </div>

    <UButton
      block
      variant="soft"
      color="primary"
      icon="i-lucide-eye"
      @click="openView(student)"
    >
      {{ t('pages.students.card.viewProfile') }}
    </UButton>
  </UCard>
</template>
