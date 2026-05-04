<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ApiParent } from '~/types'
import ConfirmDialog from '~/components/planner/ConfirmDialog.vue'

definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.parents.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const {
  parents,
  isLoading,
  fetchParents,
  createParent,
  updateParent,
  deleteParent
} = useSchoolParents()

const formOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  name: '',
  email: '',
  identity_number: '',
  phone: '',
  children_count: 0,
  children_names: '',
  status: 'active' as 'active' | 'inactive'
})

const deleteOpen = ref(false)
const deleteTarget = ref<ApiParent | null>(null)

const statusItems = computed(() => [
  { label: t('pages.parents.table.active'), value: 'active' as const },
  { label: t('pages.parents.table.inactive'), value: 'inactive' as const }
])

function telHref(phone: string) {
  return `tel:${phone.replace(/[\s().-]/g, '')}`
}

function toastApiError(e: unknown) {
  const raw = (e as { data?: { message?: string | string[] } })?.data?.message
  const message = Array.isArray(raw) ? raw.join(', ') : (typeof raw === 'string' ? raw : t('pages.parents.toastError'))
  toast.add({ title: message, color: 'error' })
}

const columns = computed<TableColumn<ApiParent>[]>(() => [
  { accessorKey: 'id', header: t('pages.parents.table.id') },
  { accessorKey: 'name', header: t('pages.parents.table.name') },
  { accessorKey: 'email', header: t('pages.parents.table.email') },
  {
    accessorKey: 'identity_number',
    header: t('pages.parents.table.identityNumber'),
    meta: { class: { th: 'text-end', td: 'text-end' } }
  },
  {
    accessorKey: 'phone',
    header: t('pages.parents.table.phone'),
    meta: { class: { th: 'text-end', td: 'text-end' } }
  },
  {
    accessorKey: 'children_count',
    header: t('pages.parents.table.childrenCount'),
    meta: { class: { th: 'text-end', td: 'text-end tabular-nums' } }
  },
  { accessorKey: 'children_names', header: t('pages.parents.table.childrenNames') },
  { accessorKey: 'status', header: t('pages.parents.table.status') },
  { id: 'actions', header: t('pages.parents.actions') }
])

function resetForm() {
  form.name = ''
  form.email = ''
  form.identity_number = ''
  form.phone = ''
  form.children_count = 0
  form.children_names = ''
  form.status = 'active'
}

function openAdd() {
  editingId.value = null
  resetForm()
  formOpen.value = true
}

function openEdit(row: ApiParent) {
  editingId.value = row.id
  form.name = row.name
  form.email = row.email
  form.identity_number = row.identity_number
  form.phone = row.phone ?? ''
  form.children_count = row.children_count
  form.children_names = row.children_names === '—' ? '' : row.children_names
  form.status = row.status
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

function validateForm(): string | null {
  if (!form.name.trim()) return t('pages.parents.validationName')
  if (!form.email.trim()) return t('pages.parents.validationEmail')
  if (!form.identity_number.trim()) return t('pages.parents.validationIdentity')
  return null
}

function payloadFromForm() {
  const phone = form.phone.trim()
  const names = form.children_names.trim()
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    identity_number: form.identity_number.trim(),
    phone: phone.length ? phone : null,
    children_count: Math.max(0, Number(form.children_count) || 0),
    children_names: names.length ? names : '—',
    status: form.status
  }
}

async function submitForm() {
  const err = validateForm()
  if (err) {
    toast.add({ title: err, color: 'error' })
    return
  }
  saving.value = true
  try {
    const payload = payloadFromForm()
    if (editingId.value != null) {
      await updateParent(editingId.value, payload)
      toast.add({ title: t('pages.parents.toastUpdated'), color: 'success' })
    } else {
      await createParent(payload)
      toast.add({ title: t('pages.parents.toastCreated'), color: 'success' })
    }
    closeForm()
    await fetchParents()
  } catch (e) {
    toastApiError(e)
  } finally {
    saving.value = false
  }
}

function requestDelete(row: ApiParent) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function onDeleteConfirm() {
  if (!deleteTarget.value) return
  try {
    await deleteParent(deleteTarget.value.id)
    toast.add({ title: t('pages.parents.toastDeleted'), color: 'success' })
    deleteTarget.value = null
    await fetchParents()
  } catch (e) {
    toastApiError(e)
  }
}

onMounted(() => {
  fetchParents()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold">
          {{ t('pages.parents.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('pages.parents.subtitle') }}
        </p>
      </div>
      <UButton icon="i-lucide-plus" class="shrink-0" @click="openAdd">
        {{ t('pages.parents.add') }}
      </UButton>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <h2 class="font-semibold">
          {{ t('pages.parents.managementTitle') }}
        </h2>
      </template>

      <div class="overflow-x-auto">
        <UTable
          :data="parents"
          :columns="columns"
          :loading="isLoading"
          class="min-w-[960px]"
        >
          <template #identity_number-cell="{ row }">
            <span dir="ltr" class="inline-block tabular-nums font-medium">
              {{ row.original.identity_number }}
            </span>
          </template>
          <template #phone-cell="{ row }">
            <span dir="rtl" class="inline-block min-w-[9ch]">
              <a
                v-if="row.original.phone"
                :href="telHref(row.original.phone)"
                dir="ltr"
                lang="en"
                class="tabular-nums text-primary underline-offset-2 hover:underline"
                :aria-label="t('common.callPhoneAria', { phone: row.original.phone })"
              >
                {{ row.original.phone }}
              </a>
              <span v-else class="text-muted">—</span>
            </span>
          </template>
          <template #status-cell="{ row }">
            <UBadge
              variant="subtle"
              :color="row.original.status === 'active' ? 'success' : 'neutral'"
            >
              {{
                row.original.status === 'active'
                  ? t('pages.parents.table.active')
                  : t('pages.parents.table.inactive')
              }}
            </UBadge>
          </template>
          <template #actions-cell="{ row }">
            <UDropdownMenu
              :items="[[
                { label: t('pages.parents.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(row.original) },
                { label: t('pages.parents.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => requestDelete(row.original) }
              ]]"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                square
                :aria-label="t('pages.parents.actions')"
              />
            </UDropdownMenu>
          </template>
        </UTable>
      </div>
    </UCard>

    <UModal
      v-model:open="formOpen"
      :title="editingId != null ? t('pages.parents.formEditTitle') : t('pages.parents.formAddTitle')"
      :description="t('pages.parents.formHint')"
      :ui="{ content: 'sm:max-w-lg rounded-2xl', footer: 'justify-end' }"
    >
      <UButton class="sr-only" :label="t('pages.parents.add')" tabindex="-1" />
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('pages.parents.fieldName')" name="name">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldEmail')" name="email">
            <UInput v-model="form.email" type="email" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldIdentity')" name="identity_number">
            <UInput
              v-model="form.identity_number"
              :placeholder="t('pages.parents.fieldIdentityPlaceholder')"
              class="w-full"
              dir="ltr"
            />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldPhone')" name="phone">
            <UInput v-model="form.phone" class="w-full" dir="ltr" />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldChildrenCount')" name="children_count">
            <UInput v-model.number="form.children_count" type="number" min="0" class="w-full" dir="ltr" />
          </UFormField>
          <UFormField
            :label="t('pages.parents.fieldChildrenNames')"
            name="children_names"
            :hint="t('pages.parents.fieldChildrenNamesHint')"
          >
            <UInput v-model="form.children_names" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldStatus')" name="status">
            <USelect
              v-model="form.status"
              :items="statusItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" color="neutral" :disabled="saving" @click="close">
          {{ t('pages.parents.cancel') }}
        </UButton>
        <UButton :loading="saving" @click="submitForm">
          {{ t('pages.parents.save') }}
        </UButton>
      </template>
    </UModal>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('pages.parents.deleteConfirmTitle')"
      :message="deleteTarget ? t('pages.parents.deleteConfirmMessage', { name: deleteTarget.name }) : ''"
      destructive
      :confirm-label="t('pages.parents.delete')"
      @confirm="onDeleteConfirm"
    />
  </div>
</template>
