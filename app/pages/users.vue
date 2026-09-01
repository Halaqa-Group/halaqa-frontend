<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ListUsersQuery, ManagedUser, UserStatus } from '~/composables/useUsers'
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import UserFormModal from '~/components/user/FormModal.vue'
import AdminResetPasswordModal from '~/components/user/AdminResetPasswordModal.vue'

definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.users.title' }
  ]
})

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()

const usersApi = useUsers()
const { roles: rolesCatalog, ensureLoaded: ensureRolesLoaded, localizedName } = useRoles()

const dateLocale = computed(() => locale.value === 'ar' ? 'ar-SA' : 'en-US')
function formatDate(iso: string | null) {
  if (!iso) return t('pages.users.neverLoggedIn')
  return new Date(iso).toLocaleString(dateLocale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn'
  })
}

const page = ref(1)
const limit = ref(20)
const search = ref('')
const role = ref<string | null>(null)
const status = ref<UserStatus | null>(null)

const data = ref<ManagedUser[]>([])
const total = ref(0)
const isLoading = ref(false)
const loadError = ref('')
const exportAction = ref<'excel' | 'clipboard' | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const roleItems = computed(() => ([
  { label: t('pages.users.filters.allRoles'), value: null as string | null },
  ...rolesCatalog.value.map(r => ({ label: locale.value === 'ar' ? r.nameAr : r.nameEn, value: r.slug }))
]))

const statusItems = computed(() => ([
  { label: t('pages.users.filters.allStatuses'), value: null as UserStatus | null },
  { label: t('pages.users.status.active'), value: 'active' as const },
  { label: t('pages.users.status.inactive'), value: 'inactive' as const },
  { label: t('pages.users.status.suspended'), value: 'suspended' as const }
]))

const filtersOpen = ref(false)
const activeFilterCount = computed(() => (role.value ? 1 : 0) + (status.value ? 1 : 0))
function clearFilters() {
  role.value = null
  status.value = null
}

const showingText = computed(() => {
  if (total.value === 0) return ''
  const from = (page.value - 1) * limit.value + 1
  const to = Math.min(page.value * limit.value, total.value)
  return t('pages.users.showingCount', { from, to, total: total.value })
})

async function load() {
  loadError.value = ''
  isLoading.value = true
  try {
    const query: ListUsersQuery = {
      page: page.value,
      limit: limit.value,
      search: search.value.trim() || undefined,
      role: role.value || undefined,
      status: status.value || undefined
    }
    const res = await usersApi.list(query)
    data.value = res.items
    total.value = res.total
  } catch (e: unknown) {
    loadError.value = apiError.format(e, t('pages.users.loadError'))
    // Don't leave the previous page/filter's users under the new selection.
    data.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

watch([page, limit, role, status], () => {
  load()
})

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})

watch([role, status], () => {
  page.value = 1
})

onMounted(async () => {
  await ensureRolesLoaded()
  await load()
})

const formOpen = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const editingUser = ref<ManagedUser | null>(null)

function openAdd() {
  formMode.value = 'add'
  editingUser.value = null
  formOpen.value = true
}

function openEdit(u: ManagedUser) {
  formMode.value = 'edit'
  editingUser.value = u
  formOpen.value = true
}

const deleteOpen = ref(false)
const deleteTarget = ref<ManagedUser | null>(null)

function requestDelete(u: ManagedUser) {
  deleteTarget.value = u
  deleteOpen.value = true
}

async function onDeleteConfirm() {
  const target = deleteTarget.value
  if (!target) return
  deleteTarget.value = null
  try {
    await usersApi.softDelete(target.id)
    toast.add({ title: t('pages.users.deleteConfirm.deletedToast'), color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('auth.genericError')), color: 'error' })
  }
}

const resetOpen = ref(false)
const resetTarget = ref<ManagedUser | null>(null)

function requestResetPassword(u: ManagedUser) {
  resetTarget.value = u
  resetOpen.value = true
}

function onSaved() {
  formOpen.value = false
  load()
}

function onResetDone() {
  resetOpen.value = false
  resetTarget.value = null
}

const columns = computed<TableColumn<ManagedUser>[]>(() => [
  { accessorKey: 'name', header: t('pages.users.columns.user') },
  { accessorKey: 'roles', header: t('pages.users.columns.roles') },
  { accessorKey: 'status', header: t('pages.users.columns.status') },
  { accessorKey: 'lastLoginAt', header: t('pages.users.columns.lastLogin') },
  { id: 'actions', header: t('pages.users.columns.actions') }
])

function statusColor(s: UserStatus) {
  switch (s) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'neutral'
    default:
      return 'warning'
  }
}

function exportQuery(pageNumber: number, pageLimit: number): ListUsersQuery {
  return {
    page: pageNumber,
    limit: pageLimit,
    search: search.value.trim() || undefined,
    role: role.value || undefined,
    status: status.value || undefined
  }
}

async function getFilteredUsers() {
  const pageLimit = 100
  const firstPage = await usersApi.list(exportQuery(1, pageLimit))
  const users = [...firstPage.items]
  const pageCount = Math.ceil(firstPage.total / pageLimit)

  for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
    const result = await usersApi.list(exportQuery(pageNumber, pageLimit))
    users.push(...result.items)
  }

  return users
}

function exportHeaders() {
  return [
    t('pages.users.export.columns.fullName'),
    t('pages.users.export.columns.role'),
    t('pages.users.export.columns.phone'),
    t('pages.users.export.columns.idNumber'),
    t('pages.users.export.columns.email')
  ]
}

function exportRows(users: ManagedUser[]) {
  return users.map(user => [
    [user.firstName, user.secondName, user.thirdName, user.familyName].filter(Boolean).join(' '),
    user.roles.map(localizedName).join('، '),
    user.phone ?? '',
    user.idNumber ?? '',
    user.email ?? ''
  ])
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

function downloadExcel(rows: string[][]) {
  const cells = [exportHeaders(), ...rows]
    .map((row, rowIndex) => `<Row>${row.map(value => `<Cell${rowIndex === 0 ? ' ss:StyleID="Header"' : ''}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`)
    .join('')
  const worksheetName = escapeXml(t('pages.users.export.sheetName'))
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial"/></Style><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="${worksheetName}"><Table>${cells}</Table></Worksheet></Workbook>`
  const blob = new Blob([`\uFEFF${workbook}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${t('pages.users.export.fileName')}-${new Date().toISOString().slice(0, 10)}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

async function runExport(action: 'excel' | 'clipboard') {
  exportAction.value = action
  try {
    const users = await getFilteredUsers()
    if (users.length === 0) {
      toast.add({ title: t('pages.users.export.noData'), color: 'warning' })
      return
    }

    const rows = exportRows(users)
    if (action === 'excel') {
      downloadExcel(rows)
      toast.add({ title: t('pages.users.export.excelSuccess', { count: users.length }), color: 'success' })
    } else {
      const text = [exportHeaders(), ...rows]
        .map(row => row.map(value => value.replaceAll('\t', ' ').replaceAll(/\r?\n/g, ' ')).join('\t'))
        .join('\n')
      await navigator.clipboard.writeText(text)
      toast.add({ title: t('pages.users.export.copySuccess', { count: users.length }), color: 'success' })
    }
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.users.export.error')), color: 'error' })
  } finally {
    exportAction.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <CommonToolbar>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        class="flex-1 min-w-40 sm:max-w-sm"
        :placeholder="t('pages.users.searchPlaceholder')"
      />

      <UPopover v-model:open="filtersOpen">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-list-filter"
          :aria-label="t('pages.users.filters.label')"
        >
          <span class="hidden sm:inline">{{ t('pages.users.filters.label') }}</span>
          <UBadge v-if="activeFilterCount" color="primary" variant="solid" size="sm" class="tabular-nums">
            {{ activeFilterCount }}
          </UBadge>
        </UButton>
        <template #content>
          <div class="p-3 w-64 space-y-3">
            <UFormField :label="t('pages.users.columns.roles')">
              <USelectMenu v-model="role" :items="roleItems" value-key="value" class="w-full" />
            </UFormField>
            <UFormField :label="t('pages.users.columns.status')">
              <USelectMenu v-model="status" :items="statusItems" value-key="value" class="w-full" />
            </UFormField>
            <UButton
              v-if="activeFilterCount"
              block
              variant="soft"
              color="neutral"
              icon="i-lucide-x"
              size="sm"
              @click="clearFilters"
            >
              {{ t('pages.users.filters.clear') }}
            </UButton>
          </div>
        </template>
      </UPopover>

      <template #actions>
        <span class="hidden text-xs text-muted lg:inline">{{ showingText }}</span>
        <UDropdownMenu
          :items="[[
            { label: t('pages.users.export.excel'), icon: 'i-lucide-file-spreadsheet', onSelect: () => runExport('excel') },
            { label: t('pages.users.export.copy'), icon: 'i-lucide-copy', onSelect: () => runExport('clipboard') }
          ]]"
        >
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            :loading="exportAction !== null"
            :disabled="isLoading || exportAction !== null"
          >
            <span class="hidden sm:inline">{{ t('pages.users.export.button') }}</span>
          </UButton>
        </UDropdownMenu>
        <UButton icon="i-lucide-plus" class="shrink-0" @click="openAdd">
          {{ t('pages.users.addButton') }}
        </UButton>
      </template>
    </CommonToolbar>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div>
        <UAlert
          v-if="loadError"
          color="error"
          variant="soft"
          :title="loadError"
          class="mb-4"
        />

        <UTable
          :data="data"
          :columns="columns"
          :loading="isLoading"
          :ui="{ base: 'w-full min-w-[720px]' }"
        >
          <template #name-cell="{ row }">
            <div class="min-w-0">
              <div class="font-semibold truncate">
                {{ row.original.name }}
              </div>
              <div class="text-xs text-muted truncate">
                {{ row.original.phone }}
              </div>
            </div>
          </template>

          <template #roles-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="slug in row.original.roles"
                :key="slug"
                size="sm"
                variant="soft"
                color="primary"
              >
                {{ localizedName(slug) }}
              </UBadge>
              <span v-if="row.original.roles.length === 0" class="text-xs text-muted">
                —
              </span>
            </div>
          </template>

          <template #status-cell="{ row }">
            <UBadge variant="soft" :color="statusColor(row.original.status)">
              {{ t(`pages.users.status.${row.original.status}`) }}
            </UBadge>
          </template>

          <template #lastLoginAt-cell="{ row }">
            <span class="text-sm text-muted">
              {{ formatDate(row.original.lastLoginAt) }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <UDropdownMenu
              v-if="!row.original.roles.includes('principal')"
              :items="[[
                { label: t('pages.users.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(row.original) },
                { label: t('pages.users.actions.resetPassword'), icon: 'i-lucide-key-round', onSelect: () => requestResetPassword(row.original) },
                { label: t('pages.users.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => requestDelete(row.original) }
              ]]"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                square
                :aria-label="t('pages.users.columns.actions')"
              />
            </UDropdownMenu>
            <span v-else class="text-xs text-muted">—</span>
          </template>
        </UTable>

        <div v-if="!isLoading && !loadError && data.length === 0" class="text-center text-sm text-muted py-8">
          {{ t('pages.users.noResults') }}
        </div>

        <div v-if="total > 0" class="mt-0 flex items-center justify-between gap-3 border-t border-default">
          <UButton
            variant="ghost"
            color="neutral"
            :icon="locale === 'ar' ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
            :disabled="page <= 1 || isLoading"
            @click="page = Math.max(1, page - 1)"
          >
            {{ t('common.previous') }}
          </UButton>

          <div class="text-xs text-muted tabular-nums">
            {{ page }}
          </div>

          <UButton
            variant="ghost"
            color="neutral"
            :trailing-icon="locale === 'ar' ? 'i-lucide-chevron-left' : 'i-lucide-chevron-right'"
            :disabled="page * limit >= total || isLoading"
            @click="page = page + 1"
          >
            {{ t('common.next') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <UserFormModal
      v-model:open="formOpen"
      :mode="formMode"
      :user="editingUser"
      @saved="onSaved"
    />

    <AdminResetPasswordModal
      v-if="resetTarget"
      v-model:open="resetOpen"
      :user="resetTarget"
      @reset="onResetDone"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('pages.users.deleteConfirm.title')"
      :message="t('pages.users.deleteConfirm.message')"
      destructive
      :confirm-label="t('common.delete')"
      @confirm="onDeleteConfirm"
    />
  </div>
</template>
