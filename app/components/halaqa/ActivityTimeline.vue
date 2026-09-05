<script setup lang="ts">
import { formatTimestamp } from '~/utils/date'
import type {
  ApiActivityLogItem,
  ApiActivityLogResult,
  HalaqaActivityAction
} from '~/types'

const props = defineProps<{
  halaqaId: number
}>()

const { t, locale } = useI18n()
const { listActivity } = useHalaqaActivity()

const items = ref<ApiActivityLogItem[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const loading = ref(false)

const ACTIONS: HalaqaActivityAction[] = [
  'halaqa_created', 'halaqa_updated', 'halaqa_archived',
  'halaqa_completed', 'halaqa_restored',
  'teacher_assigned', 'teacher_unassigned', 'teacher_role_changed',
  'acting_started', 'acting_extended', 'acting_ended',
  'student_enrolled', 'student_re_enrolled', 'student_unenrolled',
  'student_transferred_in', 'student_transferred_out', 'student_completed',
  'supervisor_assigned', 'supervisor_unassigned',
  'schedule_updated'
]

const filters = reactive<{
  action: HalaqaActivityAction | null
  from_date: string
  to_date: string
}>({
  action: null,
  from_date: '',
  to_date: ''
})

const actionItems = computed(() => [
  { label: t('pages.halaqat.filters.all'), value: null },
  ...ACTIONS.map(value => ({
    label: t(`pages.halaqat.activity.actions.${value}`),
    value
  }))
])

async function load(p = 1) {
  loading.value = true
  let result: ApiActivityLogResult | undefined
  try {
    result = await listActivity(props.halaqaId, {
      page: p,
      limit: limit.value,
      action: filters.action ?? undefined,
      from_date: filters.from_date || undefined,
      to_date: filters.to_date || undefined
    })
  } catch (e) {
    loading.value = false
    throw e
  }
  // Superseded by a newer load (filter/date changed mid-flight) — it owns loading + state.
  if (result === undefined) return
  items.value = result.items
  total.value = result.total
  page.value = result.page
  limit.value = result.limit
  loading.value = false
}

watch(() => filters.action, () => load(1))
watch(() => filters.from_date, () => load(1))
watch(() => filters.to_date, () => load(1))

onMounted(() => load(1))

function actionLabel(action: HalaqaActivityAction) {
  return t(`pages.halaqat.activity.actions.${action}`)
}

function formatDate(iso: string) {
  return formatTimestamp(iso, locale.value)
}

function targetSummary(item: ApiActivityLogItem) {
  if (item.target_student_name) return item.target_student_name
  if (item.target_user_name) return item.target_user_name
  return null
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h3 class="font-semibold">
          {{ t('pages.halaqat.activity.title') }}
        </h3>
        <div class="flex flex-wrap items-end gap-3">
          <UFormField :label="t('pages.halaqat.activity.filterAction')">
            <USelect
              v-model="filters.action"
              :items="actionItems"
              value-key="value"
              class="w-48"
            />
          </UFormField>
          <UFormField :label="t('pages.halaqat.activity.filterFrom')">
            <UInput v-model="filters.from_date" type="date" class="w-36" />
          </UFormField>
          <UFormField :label="t('pages.halaqat.activity.filterTo')">
            <UInput v-model="filters.to_date" type="date" class="w-36" />
          </UFormField>
        </div>
      </div>
    </template>

    <div v-if="loading" class="p-6 text-sm text-muted">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="!items.length" class="p-6 text-sm text-muted text-center">
      {{ t('pages.halaqat.activity.noEntries') }}
    </div>
    <ul v-else class="divide-y divide-default">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-start gap-3 p-4"
      >
        <UIcon name="i-lucide-circle-dot" class="mt-1 text-muted shrink-0" />
        <div class="flex-1 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium">{{ actionLabel(item.action) }}</span>
            <span class="text-xs text-muted">{{ formatDate(item.created_at) }}</span>
          </div>
          <p class="text-sm text-muted">
            <span v-if="item.actor_name">
              {{ t('pages.halaqat.activity.actor') }}: {{ item.actor_name }}
            </span>
            <span v-if="targetSummary(item)" class="ms-2">
              · {{ targetSummary(item) }}
            </span>
          </p>
          <p v-if="item.notes" class="text-sm">
            {{ item.notes }}
          </p>
        </div>
      </li>
    </ul>

    <template v-if="total > limit" #footer>
      <div class="flex justify-end">
        <UPagination
          :page="page"
          :total="total"
          :items-per-page="limit"
          @update:page="load($event)"
        />
      </div>
    </template>
  </UCard>
</template>
