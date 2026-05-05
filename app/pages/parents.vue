<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import * as z from 'zod'
import type { ApiParent, ApiStudent } from '~/types'
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
const api = useApi()
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
  password: '',
  phone: '',
  children_names: [] as string[],
  status: 'active' as 'active' | 'inactive'
})
type ParentFormKey = 'name' | 'email' | 'password' | 'phone' | 'children_names' | 'status'
const formErrors = reactive<Partial<Record<ParentFormKey, string>>>({})
const childrenNameOptions = ref<string[]>([])

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
  form.password = ''
  form.phone = ''
  form.children_names = []
  form.status = 'active'
  clearFormErrors()
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
  form.password = ''
  form.phone = row.phone ?? ''
  form.children_names = row.children_names === '—'
    ? []
    : row.children_names.split('،').map(v => v.trim()).filter(Boolean)
  form.status = row.status
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  clearFormErrors()
}

function clearFormErrors() {
  formErrors.name = undefined
  formErrors.email = undefined
  formErrors.password = undefined
  formErrors.phone = undefined
  formErrors.children_names = undefined
  formErrors.status = undefined
}

function validateForm(): boolean {
  clearFormErrors()
  const schema = z.object({
    name: z.string().trim().min(1, t('pages.parents.validationName')),
    email: z.string().trim().min(1, t('pages.parents.validationEmail')).email(t('validation.email')),
    password: editingId.value == null
      ? z.string().trim().min(8, t('pages.parents.validationPassword'))
      : z.string().optional(),
    phone: z.string().optional(),
    children_names: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive'])
  })

  const parsed = schema.safeParse(form)
  if (parsed.success) return true

  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && field in formErrors) {
      formErrors[field as ParentFormKey] = issue.message
    }
  }
  return false
}

function payloadFromForm() {
  const phone = form.phone.trim()
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password.trim() || undefined,
    phone: phone.length ? phone : null,
    status: form.status
  }
}

async function loadChildrenOptions() {
  const rows = await api<ApiStudent[]>('/students')
  const uniqueNames = [...new Set(rows.map(s => s.name).filter(Boolean))]
  childrenNameOptions.value = uniqueNames.sort((a, b) => a.localeCompare(b, 'ar'))
}

async function submitForm() {
  if (!validateForm()) return
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

onMounted(async () => {
  await Promise.all([
    fetchParents(),
    loadChildrenOptions()
  ])
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
          <UFormField :label="t('pages.parents.fieldName')" name="name" :error="formErrors.name">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldEmail')" name="email" :error="formErrors.email">
            <UInput v-model="form.email" type="email" class="w-full" />
          </UFormField>
          <UFormField
            v-if="editingId == null"
            :label="t('pages.parents.fieldPassword')"
            name="password"
            :error="formErrors.password"
          >
            <UInput
              v-model="form.password"
              type="password"
              :placeholder="t('pages.parents.fieldPasswordPlaceholder')"
              class="w-full"
              dir="ltr"
            />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldPhone')" name="phone" :error="formErrors.phone">
            <UInput v-model="form.phone" class="w-full" dir="ltr" />
          </UFormField>
          <UFormField
            :label="t('pages.parents.fieldChildrenNames')"
            name="children_names"
            :hint="t('pages.parents.fieldChildrenNamesHint')"
            :error="formErrors.children_names"
          >
            <USelectMenu
              v-model="form.children_names"
              multiple
              :items="childrenNameOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('pages.parents.fieldStatus')" name="status" :error="formErrors.status">
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
