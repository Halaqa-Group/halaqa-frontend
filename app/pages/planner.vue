<script setup lang="ts">
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import { achievementStatusColor } from '~/utils/achievement'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.planner.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const { activeRole } = useAuth()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const {
  selectedStudentId, selectedWeekStart, plan, planStatus,
  formOpen, editing, deleteOpen, deleteTarget,
  loadStudents, loadPlan, approvePlan, unapprovePlan, deletePlan, deleteItem, openAdd
} = useWeeklyPlan()

const isStaff = computed(() => activeRole.value !== 'parent')
const canApprove = computed(() => ['principal', 'vice_principal', 'supervisor', 'teacher'].includes(activeRole.value ?? ''))
const canAdmin = computed(() => ['principal', 'vice_principal'].includes(activeRole.value ?? ''))
const canModify = computed(() => isStaff.value && planStatus.value !== 'approved')

const formRef = useTemplateRef<{ saving: Ref<boolean> } | null>('formRef')
const formSaving = computed(() => formRef.value?.saving.value ?? false)

const statusBadgeColor = computed(() => achievementStatusColor(planStatus.value === 'approved' ? 'approved' : 'unapproved'))
const statusLabel = computed(() =>
  planStatus.value === 'approved' ? t('pages.planner.approved') : t('pages.planner.draft')
)

const deletePlanOpen = ref(false)
function openDeletePlan() {
  deletePlanOpen.value = true
}

const planMenu = computed(() => {
  if (!plan.value || !canAdmin.value) return []
  return [[{ label: t('pages.planner.deletePlan'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: openDeletePlan }]]
})

function onSaved() {
  formOpen.value = false
}

async function onApprove() {
  try {
    await approvePlan()
    toast.add({ title: t('pages.planner.approvedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.approveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}

async function onUnapprove() {
  try {
    await unapprovePlan()
    toast.add({ title: t('pages.planner.unapprovedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.approveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}

async function onDeleteItem() {
  const target = deleteTarget.value
  if (!target) return
  deleteTarget.value = null
  try {
    await deleteItem(target.id)
    toast.add({ title: t('pages.planner.itemDeletedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.saveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}

async function onDeletePlan() {
  try {
    await deletePlan()
    toast.add({ title: t('pages.planner.planDeletedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: t('pages.planner.saveErrorTitle'), description: e.data?.message || e.message, color: 'error' })
  }
}

watch(selectedHalaqaId, async (id) => {
  selectedStudentId.value = undefined
  plan.value = null
  if (id) await loadStudents(id)
})
watch(selectedStudentId, () => loadPlan())
watch(selectedWeekStart, () => loadPlan())

onMounted(async () => {
  if (selectedHalaqaId.value) await loadStudents(selectedHalaqaId.value)
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold">
          {{ t('pages.planner.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('pages.planner.subtitle') }}
        </p>
      </div>

      <div v-if="hasHalaqa && selectedStudentId" class="flex items-center gap-2 flex-wrap">
        <UBadge v-if="plan" variant="subtle" :color="statusBadgeColor" size="lg">
          {{ statusLabel }}
        </UBadge>
        <UButton
          v-if="canApprove && planStatus === 'draft'"
          icon="i-lucide-check-check"
          color="primary"
          @click="onApprove"
        >
          {{ t('pages.planner.approvePlan') }}
        </UButton>
        <UButton
          v-if="canAdmin && planStatus === 'approved'"
          icon="i-lucide-undo-2"
          color="warning"
          variant="soft"
          @click="onUnapprove"
        >
          {{ t('pages.planner.unapprove') }}
        </UButton>
        <UButton
          v-if="canModify"
          icon="i-lucide-plus"
          @click="openAdd"
        >
          {{ t('pages.planner.addItem') }}
        </UButton>
        <UDropdownMenu v-if="planMenu.length" :items="planMenu" :content="{ align: 'end' }">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" square :aria-label="t('pages.planner.table.actions')" />
        </UDropdownMenu>
      </div>
    </div>

    <!-- No halaqa -->
    <div
      v-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <PlannerFilterBar />
      </template>
      <PlannerResults />
    </UCard>

    <!-- Add / edit item modal -->
    <UModal
      v-model:open="formOpen"
      :title="editing ? t('pages.planner.form.editTitle') : t('pages.planner.form.addTitle')"
      :ui="{ content: 'sm:max-w-xl rounded-2xl' }"
    >
      <template #body>
        <PlannerForm ref="formRef" @saved="onSaved" />
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton variant="soft" color="neutral" :disabled="formSaving" @click="formOpen = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton type="submit" form="planner-item-form" :loading="formSaving">
            {{ editing ? t('pages.planner.saveChanges') : t('pages.planner.addItem') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="t('pages.planner.deleteItemConfirm.title')"
      :message="t('pages.planner.deleteItemConfirm.message')"
      destructive
      :confirm-label="t('common.delete')"
      @confirm="onDeleteItem"
    />

    <ConfirmDialog
      v-model:open="deletePlanOpen"
      :title="t('pages.planner.deletePlanConfirm.title')"
      :message="t('pages.planner.deletePlanConfirm.message')"
      destructive
      :confirm-label="t('common.delete')"
      @confirm="onDeletePlan"
    />
  </div>
</template>
