<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  ApiHalaqaListItem,
  HalaqaStatus,
  HalaqaType
} from '~/types'
import {
  HALAQA_STATUSES,
  HALAQA_STATUS_COLOR,
  HALAQA_TYPES
} from '~/utils/halaqa'
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import HalaqaForm from '~/components/halaqa/HalaqaForm.vue'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.halaqat.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { canCreateHalaqa, canManageHalaqaLifecycle } = usePermissions()
const {
  halaqat,
  total,
  page,
  limit,
  isLoading,
  fetchHalaqat,
  archiveHalaqa,
  completeHalaqa,
  restoreHalaqa
} = useHalaqat()
const { initializeHalaqa } = useGlobalHalaqa()

// Create / archive / complete / restore are all principal + vice_principal;
// a supervisor or teacher reaching this page gets their own halaqat read-only.
const canManage = canManageHalaqaLifecycle

const filters = reactive<{
  type: HalaqaType | null
  status: HalaqaStatus | null
  search: string
}>({
  type: null,
  status: 'active',
  search: ''
})

const typeFilterItems = computed(() => [
  { label: t('pages.halaqat.filters.all'), value: null },
  ...HALAQA_TYPES.map(value => ({ label: t(`pages.halaqat.types.${value}`), value }))
])

const statusFilterItems = computed(() => [
  { label: t('pages.halaqat.filters.all'), value: null },
  ...HALAQA_STATUSES.map(value => ({ label: t(`pages.halaqat.status.${value}`), value }))
])

async function loadList(targetPage = 1) {
  await fetchHalaqat({
    page: targetPage,
    limit: limit.value,
    type: filters.type ?? undefined,
    status: filters.status ?? undefined,
    search: filters.search.trim() || undefined
  })
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => filters.search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(1), 300)
})
watch(() => filters.type, () => loadList(1))
watch(() => filters.status, () => loadList(1))

function clearFilters() {
  filters.type = null
  filters.status = 'active'
  filters.search = ''
}

const hasActiveFilters = computed(() =>
  filters.type !== null
  || filters.status !== 'active'
  || filters.search.trim() !== ''
)

const filtersOpen = ref(false)
const activeFilterCount = computed(() =>
  (filters.type !== null ? 1 : 0) + (filters.status !== 'active' ? 1 : 0)
)

const formOpen = ref(false)
const editing = ref<ApiHalaqaListItem | null>(null)
const formRef = useTemplateRef<{ saving: Ref<boolean> } | null>('formRef')
const formSaving = computed(() => formRef.value?.saving.value ?? false)

function openAdd() {
  editing.value = null
  formOpen.value = true
}

function openEdit(row: ApiHalaqaListItem) {
  editing.value = row
  formOpen.value = true
}

async function onFormSaved() {
  formOpen.value = false
  await loadList(page.value)
  await initializeHalaqa()
}

type LifecycleAction = 'archive' | 'complete' | 'restore'
const lifecycleOpen = ref(false)
const lifecycleAction = ref<LifecycleAction>('archive')
const lifecycleTarget = ref<ApiHalaqaListItem | null>(null)

function requestLifecycle(action: LifecycleAction, row: ApiHalaqaListItem) {
  lifecycleAction.value = action
  lifecycleTarget.value = row
  lifecycleOpen.value = true
}

const lifecycleCopy = computed(() => {
  switch (lifecycleAction.value) {
    case 'archive':
      return {
        title: t('pages.halaqat.archiveConfirmTitle'),
        message: t('pages.halaqat.archiveConfirmMessage'),
        confirm: t('pages.halaqat.archive'),
        toast: t('pages.halaqat.toastArchived'),
        destructive: true
      }
    case 'complete':
      return {
        title: t('pages.halaqat.completeConfirmTitle'),
        message: t('pages.halaqat.completeConfirmMessage'),
        confirm: t('pages.halaqat.complete'),
        toast: t('pages.halaqat.toastCompleted'),
        destructive: false
      }
    case 'restore':
      return {
        title: t('pages.halaqat.restoreConfirmTitle'),
        message: t('pages.halaqat.restoreConfirmMessage'),
        confirm: t('pages.halaqat.restore'),
        toast: t('pages.halaqat.toastRestored'),
        destructive: false
      }
  }
  return { title: '', message: '', confirm: '', toast: '', destructive: false }
})

async function onLifecycleConfirm() {
  const target = lifecycleTarget.value
  if (!target) return
  try {
    if (lifecycleAction.value === 'archive') await archiveHalaqa(target.id)
    else if (lifecycleAction.value === 'complete') await completeHalaqa(target.id)
    else if (lifecycleAction.value === 'restore') await restoreHalaqa(target.id)
    toast.add({ title: lifecycleCopy.value.toast, color: 'success' })
    lifecycleTarget.value = null
    await loadList(page.value)
    await initializeHalaqa()
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  }
}

function rowActions(row: ApiHalaqaListItem) {
  const items: Array<{ label: string, icon: string, color?: 'error', onSelect: () => void }> = [
    {
      label: t('pages.halaqat.view'),
      icon: 'i-lucide-eye',
      onSelect: () => navigateTo(`/halaqat/${row.id}`)
    }
  ]
  if (!canManage.value) return [items]

  items.push({
    label: t('pages.halaqat.edit'),
    icon: 'i-lucide-pencil',
    onSelect: () => openEdit(row)
  })

  if (row.status === 'active') {
    items.push({
      label: t('pages.halaqat.complete'),
      icon: 'i-lucide-check-circle',
      onSelect: () => requestLifecycle('complete', row)
    })
    items.push({
      label: t('pages.halaqat.archive'),
      icon: 'i-lucide-archive',
      color: 'error',
      onSelect: () => requestLifecycle('archive', row)
    })
  } else if (row.status === 'archived') {
    items.push({
      label: t('pages.halaqat.restore'),
      icon: 'i-lucide-rotate-ccw',
      onSelect: () => requestLifecycle('restore', row)
    })
  }
  return [items]
}

const columns = computed<TableColumn<ApiHalaqaListItem>[]>(() => [
  { accessorKey: 'name', header: t('pages.halaqat.table.name') },
  { accessorKey: 'type', header: t('pages.halaqat.table.type') },
  { accessorKey: 'status', header: t('pages.halaqat.table.status') },
  { accessorKey: 'primary_teacher', header: t('pages.halaqat.table.primaryTeacher') },
  { accessorKey: 'students_count', header: t('pages.halaqat.table.students') },
  { id: 'actions', header: t('pages.halaqat.actions') }
])

const totalPages = computed(() =>
  limit.value > 0 ? Math.ceil(total.value / limit.value) : 1
)

onMounted(() => loadList(1))
</script>

<template>
  <div class="flex flex-col gap-6">
    <CommonToolbar>
      <UInput
        v-model="filters.search"
        icon="i-lucide-search"
        :placeholder="t('pages.halaqat.filters.searchPlaceholder')"
        class="flex-1 min-w-40 sm:max-w-xs"
      />
      <UPopover v-model:open="filtersOpen">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-list-filter"
          :aria-label="t('pages.halaqat.filters.label')"
        >
          <span class="hidden sm:inline">{{ t('pages.halaqat.filters.label') }}</span>
          <UBadge v-if="activeFilterCount" color="primary" variant="solid" size="sm" class="tabular-nums">
            {{ activeFilterCount }}
          </UBadge>
        </UButton>
        <template #content>
          <div class="p-3 w-64 space-y-3">
            <UFormField :label="t('pages.halaqat.filters.type')">
              <USelect v-model="filters.type" :items="typeFilterItems" value-key="value" class="w-full" />
            </UFormField>
            <UFormField :label="t('pages.halaqat.filters.status')">
              <USelect v-model="filters.status" :items="statusFilterItems" value-key="value" class="w-full" />
            </UFormField>
            <UButton
              v-if="hasActiveFilters"
              block
              variant="soft"
              color="neutral"
              icon="i-lucide-x"
              size="sm"
              @click="clearFilters"
            >
              {{ t('pages.halaqat.filters.clear') }}
            </UButton>
          </div>
        </template>
      </UPopover>

      <template v-if="canCreateHalaqa" #actions>
        <UButton icon="i-lucide-plus" class="shrink-0" @click="openAdd">
          {{ t('pages.halaqat.add') }}
        </UButton>
      </template>
    </CommonToolbar>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="overflow-x-auto">
        <UTable
          :data="halaqat"
          :columns="columns"
          :loading="isLoading"
          :empty-state="{ icon: 'i-lucide-circle-slash-2', label: t('pages.halaqat.noResults') }"
          class="min-w-[800px]"
        >
          <template #name-cell="{ row }">
            <NuxtLink
              :to="`/halaqat/${row.original.id}`"
              class="font-medium hover:underline"
            >
              {{ row.original.name }}
            </NuxtLink>
          </template>
          <template #type-cell="{ row }">
            <UBadge variant="subtle" color="neutral">
              {{ t(`pages.halaqat.types.${row.original.type}`) }}
            </UBadge>
          </template>
          <template #status-cell="{ row }">
            <UBadge
              variant="subtle"
              :color="HALAQA_STATUS_COLOR[row.original.status]"
            >
              {{ t(`pages.halaqat.status.${row.original.status}`) }}
            </UBadge>
          </template>
          <template #primary_teacher-cell="{ row }">
            <div v-if="row.original.primary_teacher" class="flex items-center gap-2">
              <span>{{ row.original.primary_teacher.name }}</span>
              <UBadge
                v-if="row.original.primary_teacher.is_acting"
                variant="subtle"
                color="warning"
                size="sm"
              >
                {{ t('pages.halaqat.actingBadge') }}
              </UBadge>
            </div>
            <span v-else class="text-muted">{{ t('pages.halaqat.primaryTeacherEmpty') }}</span>
          </template>
          <template #students_count-cell="{ row }">
            {{ row.original.students_count }}
          </template>
          <template #actions-cell="{ row }">
            <UDropdownMenu :items="rowActions(row.original)">
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

      <template v-if="totalPages > 1" #footer>
        <div class="flex justify-end">
          <UPagination
            :page="page"
            :total="total"
            :items-per-page="limit"
            @update:page="loadList($event)"
          />
        </div>
      </template>
    </UCard>

    <UModal
      v-model:open="formOpen"
      :title="editing ? t('pages.halaqat.formEditTitle') : t('pages.halaqat.formAddTitle')"
      :ui="{ content: 'sm:max-w-2xl rounded-2xl' }"
    >
      <UButton class="sr-only" :label="t('pages.halaqat.add')" tabindex="-1" />
      <template #body>
        <HalaqaForm
          ref="formRef"
          :editing="editing"
          @saved="onFormSaved"
        />
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton
            variant="soft"
            color="neutral"
            :disabled="formSaving"
            @click="formOpen = false"
          >
            {{ t('pages.halaqat.cancel') }}
          </UButton>
          <UButton type="submit" form="halaqa-form" :loading="formSaving">
            {{ t('pages.halaqat.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <ConfirmDialog
      v-model:open="lifecycleOpen"
      :title="lifecycleCopy.title"
      :message="lifecycleCopy.message"
      :destructive="lifecycleCopy.destructive"
      :confirm-label="lifecycleCopy.confirm"
      @confirm="onLifecycleConfirm"
    />
  </div>
</template>
