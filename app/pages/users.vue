<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ApiUserDirectoryRow, UserDirectoryRole } from '~/types'

definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.users.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const { users, isLoading, fetchUsers, createUser } = useDirectoryUsers()

const search = ref('')
const roleFilter = ref<string>('all')
const formOpen = ref(false)
const saving = ref(false)

const form = reactive({
  name: '',
  email: '',
  identity_number: '',
  phone: '',
  role: 'teacher' as UserDirectoryRole
})

const debouncedFetch = useDebounceFn(() => {
  return fetchUsers(search.value, roleFilter.value)
}, 320)

watch(search, () => {
  debouncedFetch()
})

watch(roleFilter, () => {
  fetchUsers(search.value, roleFilter.value)
})

function telHref(phone: string) {
  return `tel:${phone.replace(/[\s().-]/g, '')}`
}

function toastApiError(e: unknown) {
  const raw = (e as { data?: { message?: string | string[] } })?.data?.message
  const message = Array.isArray(raw) ? raw.join(', ') : (typeof raw === 'string' ? raw : t('pages.users.toastError'))
  toast.add({ title: message, color: 'error' })
}

const roleFilterItems = computed(() => [
  { label: t('pages.users.filterAll'), value: 'all' },
  { label: t('roles.teacher'), value: 'teacher' },
  { label: t('roles.parent'), value: 'parent' },
  { label: t('roles.principal'), value: 'principal' },
  { label: t('roles.admin'), value: 'admin' }
])

const formRoleItems = computed(() => [
  { label: t('roles.teacher'), value: 'teacher' as const },
  { label: t('roles.parent'), value: 'parent' as const },
  { label: t('roles.principal'), value: 'principal' as const },
  { label: t('roles.admin'), value: 'admin' as const }
])

const columns = computed<TableColumn<ApiUserDirectoryRow>[]>(() => [
  { accessorKey: 'id', header: t('pages.users.table.id') },
  { accessorKey: 'name', header: t('pages.users.table.name') },
  { accessorKey: 'email', header: t('pages.users.table.email') },
  {
    accessorKey: 'identity_number',
    header: t('pages.users.table.identityNumber'),
    meta: { class: { th: 'text-end', td: 'text-end' } }
  },
  {
    accessorKey: 'phone',
    header: t('pages.users.table.phone'),
    meta: { class: { th: 'text-end', td: 'text-end' } }
  },
  { accessorKey: 'role', header: t('pages.users.table.role') },
  { accessorKey: 'status', header: t('pages.users.table.status') }
])

function resetForm() {
  form.name = ''
  form.email = ''
  form.identity_number = ''
  form.phone = ''
  form.role = 'teacher'
}

function openAdd() {
  resetForm()
  formOpen.value = true
}

function validateForm(): string | null {
  if (!form.name.trim()) return t('pages.users.validationName')
  if (!form.email.trim()) return t('pages.users.validationEmail')
  if (!form.identity_number.trim()) return t('pages.users.validationIdentity')
  return null
}

async function submitForm() {
  const err = validateForm()
  if (err) {
    toast.add({ title: err, color: 'warning' })
    return
  }
  saving.value = true
  try {
    const phone = form.phone.trim()
    await createUser({
      name: form.name.trim(),
      email: form.email.trim(),
      identity_number: form.identity_number.trim(),
      phone: phone.length ? phone : null,
      role: form.role
    })
    toast.add({ title: t('pages.users.toastCreated'), color: 'success' })
    formOpen.value = false
    await fetchUsers(search.value, roleFilter.value)
  } catch (e) {
    toastApiError(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchUsers(search.value, roleFilter.value)
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold">
          {{ t('pages.users.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('pages.users.subtitle') }}
        </p>
      </div>
      <UButton icon="i-lucide-user-plus" class="shrink-0" @click="openAdd">
        {{ t('pages.users.add') }}
      </UButton>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <UInput
        v-model="search"
        :placeholder="t('pages.users.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-full sm:flex-1 sm:max-w-md"
      />
      <USelect
        v-model="roleFilter"
        :items="roleFilterItems"
        value-key="value"
        class="w-full sm:w-56"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <h2 class="font-semibold">
          {{ t('pages.users.listTitle') }}
        </h2>
      </template>

      <div class="overflow-x-auto">
        <UTable
          :data="users"
          :columns="columns"
          :loading="isLoading"
          class="min-w-[920px]"
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
          <template #role-cell="{ row }">
            <UBadge variant="subtle" color="neutral">
              {{ t(`roles.${row.original.role}`) }}
            </UBadge>
          </template>
          <template #status-cell="{ row }">
            <UBadge
              variant="subtle"
              :color="row.original.status === 'active' ? 'success' : 'neutral'"
            >
              {{
                row.original.status === 'active'
                  ? t('pages.users.table.active')
                  : t('pages.users.table.inactive')
              }}
            </UBadge>
          </template>
        </UTable>
      </div>
    </UCard>

    <UModal
      v-model:open="formOpen"
      :title="t('pages.users.formTitle')"
      :description="t('pages.users.formHint')"
      :ui="{ content: 'sm:max-w-lg rounded-2xl', footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('pages.users.fieldName')" name="name">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.users.fieldEmail')" name="email">
            <UInput v-model="form.email" type="email" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.users.fieldIdentity')" name="identity_number">
            <UInput
              v-model="form.identity_number"
              :placeholder="t('pages.users.fieldIdentityPlaceholder')"
              class="w-full"
              dir="ltr"
            />
          </UFormField>
          <UFormField :label="t('pages.users.fieldRole')" name="role">
            <USelect
              v-model="form.role"
              :items="formRoleItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('pages.users.fieldPhone')" name="phone">
            <UInput v-model="form.phone" class="w-full" dir="ltr" />
          </UFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" color="neutral" :disabled="saving" @click="close">
          {{ t('pages.users.cancel') }}
        </UButton>
        <UButton :loading="saving" @click="submitForm">
          {{ t('pages.users.save') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
