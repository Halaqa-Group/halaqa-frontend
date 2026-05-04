<script setup lang="ts">
import type { ManagedUser, UserStatus } from '~/composables/useUsers'

definePageMeta({
  middleware: ['principal'],
  breadcrumb: [{ label: 'pages.users.title' }]
})

const { t, locale } = useI18n()
const toast = useToast()
const usersApi = useUsers()
const { roles: rolesCatalog, ensureLoaded: ensureRolesLoaded, localizedName: roleLabel } = useRoles()
const apiError = useApiError()

// ── Query state ─────────────────────────────────────────────────────────────

const searchInput = ref('')
const search = refDebounced(searchInput, 300)
const roleFilter = ref<string | null>(null)
const statusFilter = ref<UserStatus | null>(null)
const page = ref(1)
const limit = ref(20)

// ── Data ────────────────────────────────────────────────────────────────────

const items = ref<ManagedUser[]>([])
const total = ref(0)
const isLoading = ref(false)
const loadError = ref('')

async function load() {
  loadError.value = ''
  isLoading.value = true
  try {
    const result = await usersApi.list({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      role: roleFilter.value || undefined,
      status: statusFilter.value || undefined
    })
    items.value = result.items
    total.value = result.total
  } catch (e: unknown) {
    loadError.value = apiError.format(e, t('pages.users.loadError'))
  } finally {
    isLoading.value = false
  }
}

// Reset to page 1 whenever filters change.
watch([search, roleFilter, statusFilter], () => {
  page.value = 1
  load()
})

watch(page, load)

onMounted(() => {
  ensureRolesLoaded()
  load()
})

// ── Derived ─────────────────────────────────────────────────────────────────

const showingFrom = computed(() => total.value === 0 ? 0 : (page.value - 1) * limit.value + 1)
const showingTo = computed(() => Math.min(page.value * limit.value, total.value))

const roleOptions = computed(() => [
  { label: t('pages.users.filters.allRoles'), value: null },
  ...rolesCatalog.value.map(r => ({
    label: locale.value === 'ar' ? r.nameAr : r.nameEn,
    value: r.slug
  }))
])

const statusOptions = computed<{ label: string, value: UserStatus | null }[]>(() => [
  { label: t('pages.users.filters.allStatuses'), value: null },
  { label: t('pages.users.status.active'), value: 'active' },
  { label: t('pages.users.status.inactive'), value: 'inactive' },
  { label: t('pages.users.status.suspended'), value: 'suspended' }
])

const dateLocale = computed(() => locale.value === 'ar' ? 'ar-SA' : 'en-US')

function formatDate(iso: string | null) {
  if (!iso) return t('pages.users.neverLoggedIn')
  return new Date(iso).toLocaleDateString(dateLocale.value, { dateStyle: 'medium' })
}

function avatarFor(u: ManagedUser) {
  return {
    src: u.photoUrl ?? undefined,
    alt: u.name,
    text: u.name.slice(0, 1).toUpperCase()
  }
}

function statusColor(s: UserStatus) {
  switch (s) {
    case 'active': return 'success'
    case 'inactive': return 'neutral'
    case 'suspended': return 'error'
  }
}

// ── Modals ──────────────────────────────────────────────────────────────────

const isFormOpen = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const formUser = ref<ManagedUser | null>(null)
const resetTarget = ref<ManagedUser | null>(null)
const deleteTarget = ref<ManagedUser | null>(null)
const isDeleting = ref(false)

function openAdd() {
  formMode.value = 'add'
  formUser.value = null
  isFormOpen.value = true
}

function openEdit(u: ManagedUser) {
  formMode.value = 'edit'
  formUser.value = u
  isFormOpen.value = true
}

function rowMenu(u: ManagedUser) {
  return [[{
    label: t('pages.users.actions.edit'),
    icon: 'i-lucide-pencil',
    onSelect: () => openEdit(u)
  }, {
    label: t('pages.users.actions.resetPassword'),
    icon: 'i-lucide-key-round',
    onSelect: () => { resetTarget.value = u }
  }, {
    label: t('pages.users.actions.delete'),
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => { deleteTarget.value = u }
  }]]
}

async function onDeleteConfirmed() {
  const target = deleteTarget.value
  if (!target) return
  isDeleting.value = true
  try {
    await usersApi.softDelete(target.id)
    toast.add({ title: t('pages.users.deleteConfirm.deletedToast'), color: 'success' })
    deleteTarget.value = null
    await load()
  } catch (e: unknown) {
    toast.add({
      title: apiError.format(e, t('pages.users.loadError')),
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}

function onUserSaved() {
  isFormOpen.value = false
  load()
}

function onPasswordReset() {
  resetTarget.value = null
}
</script>

<template>
  <div class="max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <h2 class="display-lg text-on-surface">
          {{ $t('pages.users.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.users.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.users.addButton')"
        @click="openAdd"
      />
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <UInput
        v-model="searchInput"
        icon="i-lucide-search"
        :placeholder="$t('pages.users.searchPlaceholder')"
        class="md:col-span-1"
      />
      <USelectMenu
        v-model="roleFilter"
        :items="roleOptions"
        value-key="value"
        :placeholder="$t('pages.users.filters.allRoles')"
      />
      <USelectMenu
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        :placeholder="$t('pages.users.filters.allStatuses')"
      />
    </div>

    <!-- List -->
    <UCard :ui="{ body: 'p-0' }">
      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        :title="loadError"
        class="m-4"
      />

      <div v-else-if="isLoading && items.length === 0" class="text-center text-muted py-16">
        <UIcon name="i-lucide-loader-circle" class="animate-spin w-6 h-6" />
      </div>

      <div v-else-if="items.length === 0" class="text-center text-muted py-16">
        {{ $t('pages.users.noResults') }}
      </div>

      <div v-else class="divide-y divide-default">
        <!-- Header row (md+) -->
        <div class="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs uppercase tracking-wide text-muted font-semibold">
          <div>{{ $t('pages.users.columns.user') }}</div>
          <div>{{ $t('pages.users.columns.roles') }}</div>
          <div>{{ $t('pages.users.columns.status') }}</div>
          <div>{{ $t('pages.users.columns.lastLogin') }}</div>
          <div class="w-8" />
        </div>

        <!-- Rows -->
        <div
          v-for="u in items"
          :key="u.id"
          class="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-x-4 gap-y-2 items-center px-5 py-4"
        >
          <!-- User -->
          <div class="flex items-center gap-3 min-w-0">
            <UAvatar v-bind="avatarFor(u)" size="md" />
            <div class="min-w-0">
              <div class="font-medium truncate">
                {{ u.name }}
              </div>
              <div class="text-xs text-muted truncate" dir="ltr">
                {{ u.email }}
              </div>
            </div>
          </div>

          <!-- Roles -->
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="slug in u.roles"
              :key="slug"
              color="primary"
              variant="soft"
              size="sm"
            >
              {{ roleLabel(slug) }}
            </UBadge>
            <span v-if="u.roles.length === 0" class="text-xs text-muted">—</span>
          </div>

          <!-- Status -->
          <div>
            <UBadge :color="statusColor(u.status)" variant="subtle" size="sm">
              {{ $t(`pages.users.status.${u.status}`) }}
            </UBadge>
          </div>

          <!-- Last login -->
          <div class="text-sm text-muted">
            {{ formatDate(u.lastLoginAt) }}
          </div>

          <!-- Actions -->
          <div class="flex justify-end">
            <UDropdownMenu :items="rowMenu(u)">
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
      </div>

      <!-- Pagination -->
      <div
        v-if="total > 0"
        class="flex items-center justify-between gap-4 px-5 py-3 border-t border-default text-sm"
      >
        <span class="text-muted">
          {{ $t('pages.users.showingCount', { from: showingFrom, to: showingTo, total }) }}
        </span>
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="limit"
          :sibling-count="1"
          show-edges
        />
      </div>
    </UCard>

    <!-- Modals -->
    <UserFormModal
      v-model:open="isFormOpen"
      :mode="formMode"
      :user="formUser"
      @saved="onUserSaved"
    />
    <UserAdminResetPasswordModal
      v-if="resetTarget"
      :open="!!resetTarget"
      :user="resetTarget"
      @update:open="(v) => { if (!v) resetTarget = null }"
      @reset="onPasswordReset"
    />

    <CommonConfirmDialog
      :open="!!deleteTarget"
      :title="$t('pages.users.deleteConfirm.title')"
      :message="$t('pages.users.deleteConfirm.message')"
      :confirm-label="$t('pages.users.actions.delete')"
      destructive
      :loading="isDeleting"
      @update:open="(v) => { if (!v) deleteTarget = null }"
      @confirm="onDeleteConfirmed"
    />
  </div>
</template>
