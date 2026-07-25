<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { ApiHalaqaDetail } from '~/types'
import { HALAQA_STATUS_COLOR, HALAQA_TYPE_ICON } from '~/utils/halaqa'
import HalaqaEvaluationSettingsEditor from '~/components/halaqa/EvaluationSettingsEditor.vue'
import HalaqaTeacherRoster from '~/components/halaqa/TeacherRoster.vue'
import HalaqaActingPanel from '~/components/halaqa/ActingPanel.vue'
import HalaqaStudentRoster from '~/components/halaqa/StudentRoster.vue'
import HalaqaSupervisorRoster from '~/components/halaqa/SupervisorRoster.vue'
import HalaqaActivityTimeline from '~/components/halaqa/ActivityTimeline.vue'
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.halaqat.title', to: '/halaqat' },
    { label: 'pages.halaqat.details.tabs.overview' }
  ]
})

const route = useRoute()
const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
)

const backIcon = computed(() =>
  locale.value === 'ar' ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left'
)
const { canEditHalaqaMeta, canManageHalaqaMembership } = usePermissions()
const { getHalaqa, archiveHalaqa, completeHalaqa, restoreHalaqa } = useHalaqat()

const halaqaId = computed(() => Number(route.params.id))
const halaqa = ref<ApiHalaqaDetail | null>(null)
const loading = ref(false)

// Lifecycle and every roster mutation are principal/vice_principal.
const canManage = canManageHalaqaMembership

// PATCH /halaqat/:id takes a wider set than the lifecycle actions: supervisors
// of the halaqa and its active teachers may edit the weights too.
const canEditEvaluation = computed(() =>
  !!halaqa.value && halaqa.value.status === 'active' && canEditHalaqaMeta(halaqa.value.id)
)

async function loadDetail() {
  loading.value = true
  try {
    halaqa.value = await getHalaqa(halaqaId.value)
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
    halaqa.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)

const tab = ref('overview')
const tabs = computed<TabsItem[]>(() => [
  { value: 'overview', label: t('pages.halaqat.details.tabs.overview'), icon: 'i-lucide-info' },
  { value: 'teachers', label: t('pages.halaqat.details.tabs.teachers'), icon: 'i-lucide-graduation-cap' },
  { value: 'students', label: t('pages.halaqat.details.tabs.students'), icon: 'i-lucide-users' },
  { value: 'supervisors', label: t('pages.halaqat.details.tabs.supervisors'), icon: 'i-lucide-shield-check' },
  { value: 'activity', label: t('pages.halaqat.details.tabs.activity'), icon: 'i-lucide-activity' }
])

type LifecycleAction = 'archive' | 'complete' | 'restore'
const lifecycleOpen = ref(false)
const lifecycleAction = ref<LifecycleAction>('archive')

function requestLifecycle(action: LifecycleAction) {
  lifecycleAction.value = action
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
  if (!halaqa.value) return
  try {
    if (lifecycleAction.value === 'archive') await archiveHalaqa(halaqa.value.id)
    else if (lifecycleAction.value === 'complete') await completeHalaqa(halaqa.value.id)
    else if (lifecycleAction.value === 'restore') await restoreHalaqa(halaqa.value.id)
    toast.add({ title: lifecycleCopy.value.toast, color: 'success' })
    await loadDetail()
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  }
}

const headerActions = computed(() => {
  if (!halaqa.value || !canManage.value) return [[]]
  const items: Array<{ label: string, icon: string, color?: 'error', onSelect: () => void }> = []
  if (halaqa.value.status === 'active') {
    items.push({
      label: t('pages.halaqat.complete'),
      icon: 'i-lucide-check-circle',
      onSelect: () => requestLifecycle('complete')
    })
    items.push({
      label: t('pages.halaqat.archive'),
      icon: 'i-lucide-archive',
      color: 'error',
      onSelect: () => requestLifecycle('archive')
    })
  } else if (halaqa.value.status === 'archived') {
    items.push({
      label: t('pages.halaqat.restore'),
      icon: 'i-lucide-rotate-ccw',
      onSelect: () => requestLifecycle('restore')
    })
  }
  return items.length ? [items] : [[]]
})

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.value.format(d)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="loading && !halaqa" class="text-sm text-muted">
      {{ t('common.loading') }}
    </div>

    <template v-else-if="halaqa">
      <div class="flex flex-col gap-2">
        <UButton
          to="/halaqat"
          variant="link"
          color="neutral"
          :icon="backIcon"
          size="sm"
          class="self-start px-0 h-auto"
        >
          {{ t('pages.halaqat.details.back') }}
        </UButton>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div class="rounded-lg bg-primary/10 size-10 flex items-center justify-center shrink-0">
              <UIcon :name="HALAQA_TYPE_ICON[halaqa.type]" class="text-primary size-5" />
            </div>
            <div class="space-y-1.5 min-w-0">
              <h1 class="text-xl sm:text-2xl font-bold truncate">
                {{ halaqa.name }}
              </h1>
              <div class="flex items-center gap-1.5 flex-wrap">
                <UBadge variant="subtle" color="neutral" size="sm">
                  {{ t(`pages.halaqat.types.${halaqa.type}`) }}
                </UBadge>
                <UBadge variant="subtle" :color="HALAQA_STATUS_COLOR[halaqa.status]" size="sm">
                  {{ t(`pages.halaqat.status.${halaqa.status}`) }}
                </UBadge>
              </div>
            </div>
          </div>
          <UDropdownMenu v-if="canManage && headerActions[0]?.length" :items="headerActions">
            <UButton variant="soft" color="neutral" trailing-icon="i-lucide-chevron-down" size="sm" class="shrink-0">
              {{ t('pages.halaqat.actions') }}
            </UButton>
          </UDropdownMenu>
        </div>
      </div>

      <UTabs v-model="tab" :items="tabs" variant="link" class="w-full">
        <template #content="{ item }">
          <div v-if="item.value === 'overview'" class="grid gap-4 md:grid-cols-3 mt-4">
            <UCard>
              <p class="text-sm text-muted">
                {{ t('pages.halaqat.details.studentsCount') }}
              </p>
              <p class="text-2xl font-bold mt-1">
                {{ halaqa.students_count }}
              </p>
            </UCard>
            <UCard>
              <p class="text-sm text-muted">
                {{ t('pages.halaqat.details.createdAt') }}
              </p>
              <p class="text-sm font-medium mt-1">
                {{ formatDate(halaqa.created_at) }}
              </p>
            </UCard>
            <UCard>
              <p class="text-sm text-muted">
                {{ t('pages.halaqat.details.updatedAt') }}
              </p>
              <p class="text-sm font-medium mt-1">
                {{ formatDate(halaqa.updated_at) }}
              </p>
            </UCard>

            <UCard class="md:col-span-3">
              <HalaqaEvaluationSettingsEditor
                :halaqa-id="halaqa.id"
                :initial="halaqa.evaluation_settings"
                :read-only="!canEditEvaluation"
                @saved="loadDetail"
              />
            </UCard>

            <UCard class="md:col-span-3">
              <HalaqaReportWeightsEditor
                :halaqa-id="halaqa.id"
                :initial="halaqa.report_weights"
                :read-only="!canEditEvaluation"
                @saved="loadDetail"
              />
            </UCard>
          </div>

          <div v-else-if="item.value === 'teachers'" class="space-y-4 mt-4">
            <HalaqaActingPanel
              :halaqa-id="halaqa.id"
              :teachers="halaqa.teachers"
              :can-manage="canManage && halaqa.status === 'active'"
              @changed="loadDetail"
            />
            <HalaqaTeacherRoster
              :halaqa-id="halaqa.id"
              :teachers="halaqa.teachers"
              :can-manage="canManage && halaqa.status === 'active'"
              @changed="loadDetail"
            />
          </div>

          <div v-else-if="item.value === 'students'" class="mt-4">
            <HalaqaStudentRoster
              :halaqa-id="halaqa.id"
              :can-manage="canManage && halaqa.status === 'active'"
              @changed="loadDetail"
            />
          </div>

          <div v-else-if="item.value === 'supervisors'" class="mt-4">
            <HalaqaSupervisorRoster
              :halaqa-id="halaqa.id"
              :supervisors="halaqa.supervisors"
              :can-manage="canManage"
              @changed="loadDetail"
            />
          </div>

          <div v-else-if="item.value === 'activity'" class="mt-4">
            <HalaqaActivityTimeline :halaqa-id="halaqa.id" />
          </div>
        </template>
      </UTabs>
    </template>

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
