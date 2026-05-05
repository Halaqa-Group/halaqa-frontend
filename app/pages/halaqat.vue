<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ApiHalaqa } from '~/types'
import ConfirmDialog from '~/components/planner/ConfirmDialog.vue'

definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.halaqat.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const {
  halaqat,
  isLoading,
  fetchHalaqat,
  fetchTeachers,
  createHalaqa,
  updateHalaqa,
  deleteHalaqa
} = useHalaqat()
const { initializeHalaqa } = useGlobalHalaqa()

const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const
const DAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const

const teachers = ref<Array<{ label: string, value: number }>>([])

const formOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  name: '',
  type: 'Memorization' as ApiHalaqa['type'],
  teacher_id: null as number | null,
  days: [] as number[]
})

const deleteOpen = ref(false)
const deleteTarget = ref<ApiHalaqa | null>(null)

const typeItems = computed(() =>
  (['Memorization', 'Tajweed', 'Aqeedah'] as const).map(value => ({
    label: t(`pages.halaqat.types.${value}`),
    value
  }))
)

function formatSchedule(row: ApiHalaqa) {
  const keys = DAY_KEYS
  const sorted = [...row.schedules].sort((a, b) => a.day_of_week - b.day_of_week)
  return sorted
    .map((s) => {
      const k = keys[s.day_of_week]
      return k ? t(`pages.halaqat.dayShort.${k}`) : ''
    })
    .filter(Boolean)
    .join(' · ')
}

function daySelected(d: number) {
  return form.days.includes(d)
}

function toggleDay(d: number) {
  const set = new Set(form.days)
  if (set.has(d)) set.delete(d)
  else set.add(d)
  form.days = [...set].sort((a, b) => a - b)
}

function resetFormDefaults() {
  form.name = ''
  form.type = 'Memorization'
  form.teacher_id = teachers.value[0]?.value ?? null
  form.days = [0, 1, 2, 3, 4]
}

function openAdd() {
  editingId.value = null
  resetFormDefaults()
  formOpen.value = true
}

function openEdit(row: ApiHalaqa) {
  editingId.value = row.id
  form.name = row.name
  form.type = row.type
  form.teacher_id = row.teacher_id
  form.days = [...new Set(row.schedules.map(s => s.day_of_week))].sort((a, b) => a - b)
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

function validateForm(): string | null {
  if (!form.name.trim()) return t('pages.halaqat.validationName')
  if (form.teacher_id == null) return t('pages.halaqat.validationTeacher')
  if (!form.days.length) return t('pages.halaqat.validationDays')
  return null
}

async function submitForm() {
  const err = validateForm()
  if (err) {
    toast.add({ title: err, color: 'error' })
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      teacher_id: form.teacher_id!,
      days: [...form.days]
    }
    if (editingId.value != null) {
      await updateHalaqa(editingId.value, payload)
      toast.add({ title: t('pages.halaqat.toastUpdated'), color: 'success' })
    } else {
      await createHalaqa(payload)
      toast.add({ title: t('pages.halaqat.toastCreated'), color: 'success' })
    }
    closeForm()
    await initializeHalaqa()
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: typeof msg === 'string' ? msg : t('pages.halaqat.toastError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function requestDelete(row: ApiHalaqa) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function onDeleteConfirm() {
  if (!deleteTarget.value) return
  try {
    await deleteHalaqa(deleteTarget.value.id)
    toast.add({ title: t('pages.halaqat.toastDeleted'), color: 'success' })
    deleteTarget.value = null
    await initializeHalaqa()
  } catch {
    toast.add({ title: t('pages.halaqat.toastError'), color: 'error' })
  }
}

const columns = computed<TableColumn<ApiHalaqa>[]>(() => [
  { accessorKey: 'id', header: t('pages.halaqat.table.id') },
  { accessorKey: 'name', header: t('pages.halaqat.table.name') },
  { accessorKey: 'type', header: t('pages.halaqat.table.type') },
  { accessorKey: 'teacher_name', header: t('pages.halaqat.table.teacher') },
  { accessorKey: 'schedules', header: t('pages.halaqat.table.schedule') },
  { id: 'actions', header: t('pages.halaqat.actions') }
])

onMounted(async () => {
  await fetchHalaqat()
  try {
    const list = await fetchTeachers()
    teachers.value = list.map(u => ({ label: u.name, value: u.id }))
    if (form.teacher_id == null && teachers.value[0]) form.teacher_id = teachers.value[0].value
  } catch {
    teachers.value = []
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold">
          {{ t('pages.halaqat.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('pages.halaqat.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        class="shrink-0"
        @click="openAdd"
      >
        {{ t('pages.halaqat.add') }}
      </UButton>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <h2 class="font-semibold">
          {{ t('pages.halaqat.managementTitle') }}
        </h2>
      </template>

      <div class="overflow-x-auto">
        <UTable
          :data="halaqat"
          :columns="columns"
          :loading="isLoading"
          class="min-w-[720px]"
        >
          <template #type-cell="{ row }">
            <UBadge variant="subtle" color="neutral">
              {{ t(`pages.halaqat.types.${row.original.type}`) }}
            </UBadge>
          </template>
          <template #teacher_name-cell="{ row }">
            {{ row.original.teacher_name ?? '—' }}
          </template>
          <template #schedules-cell="{ row }">
            {{ formatSchedule(row.original) }}
          </template>
          <template #actions-cell="{ row }">
            <UDropdownMenu
              :items="[[
                {
                  label: t('pages.halaqat.edit'),
                  icon: 'i-lucide-pencil',
                  onSelect: () => openEdit(row.original)
                },
                {
                  label: t('pages.halaqat.delete'),
                  icon: 'i-lucide-trash-2',
                  color: 'error',
                  onSelect: () => requestDelete(row.original)
                }
              ]]"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                square
                :aria-label="t('pages.halaqat.actions')"
              />
            </UDropdownMenu>
          </template>
        </UTable>
      </div>
    </UCard>

    <UModal
      v-model:open="formOpen"
      :title="editingId != null ? t('pages.halaqat.formEditTitle') : t('pages.halaqat.formAddTitle')"
      :description="t('pages.halaqat.formHint')"
      :ui="{ content: 'sm:max-w-lg rounded-2xl', footer: 'justify-end' }"
    >
      <!-- Nuxt UI Modal expects a default-slot trigger; opening is controlled via v-model from the toolbar. -->
      <UButton class="sr-only" :label="t('pages.halaqat.add')" tabindex="-1" />
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('pages.halaqat.fieldName')" name="name">
            <UInput
              v-model="form.name"
              :placeholder="t('pages.halaqat.fieldNamePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('pages.halaqat.fieldType')" name="type">
            <USelect
              v-model="form.type"
              :items="typeItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('pages.halaqat.fieldTeacher')" name="teacher">
            <USelect
              v-model="form.teacher_id"
              :items="teachers"
              value-key="value"
              :placeholder="t('pages.halaqat.fieldTeacherPlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('pages.halaqat.fieldDays')" name="days" :hint="t('pages.halaqat.fieldDaysHint')">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="d in DAY_ORDER"
                :key="d"
                size="sm"
                :variant="daySelected(d) ? 'solid' : 'outline'"
                :color="daySelected(d) ? 'primary' : 'neutral'"
                type="button"
                @click="toggleDay(d)"
              >
                {{ t(`pages.halaqat.dayShort.${DAY_KEYS[d]}`) }}
              </UButton>
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" color="neutral" :disabled="saving" @click="close">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton :loading="saving" @click="submitForm">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </template>
    </UModal>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('pages.halaqat.deleteConfirmTitle')"
      :message="deleteTarget ? t('pages.halaqat.deleteConfirmMessage', { name: deleteTarget.name }) : ''"
      destructive
      :confirm-label="t('pages.halaqat.delete')"
      @confirm="onDeleteConfirm"
    />
  </div>
</template>
