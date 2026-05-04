<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.parents.title' }
  ]
})

const { t } = useI18n()

type ParentRow = {
  id: number
  name: string
  email: string
  phone: string | null
  childrenCount: number
  childrenNames: string
  status: 'active' | 'inactive'
}

/** Sample rows until `/parents` (or similar) API exists */
const data = ref<ParentRow[]>([
  {
    id: 1,
    name: 'إبراهيم السعيد',
    email: 'i.saeed@example.com',
    phone: '+966501111222',
    childrenCount: 2,
    childrenNames: 'عبدالله إبراهيم، يوسف إبراهيم',
    status: 'active'
  },
  {
    id: 2,
    name: 'فاطمة أحمد',
    email: 'f.ahmad@example.com',
    phone: null,
    childrenCount: 1,
    childrenNames: 'مريم أحمد',
    status: 'active'
  },
  {
    id: 3,
    name: 'سعد الخالدي',
    email: 's.khaledi@example.com',
    phone: '+966509998877',
    childrenCount: 0,
    childrenNames: '—',
    status: 'inactive'
  }
])

function telHref(phone: string) {
  return `tel:${phone.replace(/[\s().-]/g, '')}`
}

const columns = computed<TableColumn<ParentRow>[]>(() => [
  {
    accessorKey: 'id',
    header: t('pages.parents.table.id')
  },
  {
    accessorKey: 'name',
    header: t('pages.parents.table.name')
  },
  {
    accessorKey: 'email',
    header: t('pages.parents.table.email')
  },
  {
    accessorKey: 'phone',
    header: t('pages.parents.table.phone'),
    meta: {
      class: {
        th: 'text-end',
        td: 'text-end'
      }
    }
  },
  {
    accessorKey: 'childrenCount',
    header: t('pages.parents.table.childrenCount'),
    meta: {
      class: {
        th: 'text-end',
        td: 'text-end tabular-nums'
      }
    }
  },
  {
    accessorKey: 'childrenNames',
    header: t('pages.parents.table.childrenNames')
  },
  {
    accessorKey: 'status',
    header: t('pages.parents.table.status')
  }
])
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <h2 class="font-semibold">
        {{ t('pages.parents.managementTitle') }}
      </h2>
    </template>

    <div class="overflow-x-auto">
      <UTable
        :data="data"
        :columns="columns"
        class="min-w-[720px]"
      >
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
            class="capitalize"
          >
            {{
              row.original.status === 'active'
                ? t('pages.parents.table.active')
                : t('pages.parents.table.inactive')
            }}
          </UBadge>
        </template>
      </UTable>
    </div>
  </UCard>
</template>
