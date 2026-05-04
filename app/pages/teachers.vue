<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: ['principal-only'],
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.teachers.title' }
  ]
})

const { t } = useI18n()

type TeacherRow = {
  id: number
  name: string
  email: string
  phone: string | null
  assignedHalaqat: string
  status: 'active' | 'inactive'
}

/** Sample rows until `/teachers` (or similar) API exists */
const data = ref<TeacherRow[]>([
  {
    id: 1,
    name: 'أ. محمد العلي',
    email: 'm.alali@school.example',
    phone: '+966501234567',
    assignedHalaqat: 'حلقة الفجر، حلقة الظهر',
    status: 'active'
  },
  {
    id: 2,
    name: 'أ. أحمد الحسن',
    email: 'a.hassan@school.example',
    phone: '+966507654321',
    assignedHalaqat: 'حلقة العصر',
    status: 'active'
  },
  {
    id: 3,
    name: 'أ. خالد السعيد',
    email: 'k.saeed@school.example',
    phone: null,
    assignedHalaqat: '—',
    status: 'inactive'
  }
])

function telHref(phone: string) {
  return `tel:${phone.replace(/[\s().-]/g, '')}`
}

const columns = computed<TableColumn<TeacherRow>[]>(() => [
  {
    accessorKey: 'id',
    header: t('pages.teachers.table.id')
  },
  {
    accessorKey: 'name',
    header: t('pages.teachers.table.name')
  },
  {
    accessorKey: 'email',
    header: t('pages.teachers.table.email')
  },
  {
    accessorKey: 'phone',
    header: t('pages.teachers.table.phone'),
    meta: {
      class: {
        th: 'text-end',
        td: 'text-end'
      }
    }
  },
  {
    accessorKey: 'assignedHalaqat',
    header: t('pages.teachers.table.assignedHalaqat')
  },
  {
    accessorKey: 'status',
    header: t('pages.teachers.table.status')
  }
])
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <h2 class="font-semibold">
        {{ t('pages.teachers.managementTitle') }}
      </h2>
    </template>

    <div class="overflow-x-auto">
      <UTable
        :data="data"
        :columns="columns"
        class="min-w-[640px]"
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
                ? t('pages.teachers.table.active')
                : t('pages.teachers.table.inactive')
            }}
          </UBadge>
        </template>
      </UTable>
    </div>
  </UCard>
</template>
