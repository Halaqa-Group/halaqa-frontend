<script setup lang="ts">
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import { achievementStatusColor } from '~/utils/achievement'
import { weeklyPlanToQuranPlan } from '~/utils/plan-pdf'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.planner.title' }
  ]
})

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { canApprovePlan, canEditPlanItems, canDeletePlan, canUnapprovePlan } = usePermissions()
const { selectedHalaqaId, isHalaqaScoped } = useGlobalHalaqa()
const {
  selectedStudentId, selectedWeekStart, plan, planStatus, viewMode,
  formOpen, editing, deleteOpen, deleteTarget,
  wizardOpen, matrixDirty, matrixSummary, saveDraft, dateOfDay, studentName,
  loadStudents, loadPlan, approvePlan, unapprovePlan, deletePlan, deleteItem, openAdd
} = useWeeklyPlan()

// Creating a plan, approving it, and every plan-item mutation share one check —
// halaqa scope — and the planner only ever loads a halaqa the caller is in.
const canApprove = canApprovePlan
const canModify = computed(() => canEditPlanItems.value && planStatus.value !== 'approved')

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

// Printable PDF: map the loaded plan onto the QuranPlan template. Available
// whenever a plan with sessions exists, regardless of approval state.
const printOpen = ref(false)
const canPrint = computed(() => (plan.value?.items.length ?? 0) > 0)
const pdfPlan = computed(() => weeklyPlanToQuranPlan(plan.value, {
  studentName: selectedStudentId.value ? studentName(selectedStudentId.value) : '',
  dateForDay: dateOfDay,
  logo: '/images/logo/halaqa_logo.png'
}))

const planMenu = computed(() => {
  if (!plan.value || !canDeletePlan.value) return []
  return [[{ label: t('pages.planner.deletePlan'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: openDeletePlan }]]
})

function onSaved() {
  formOpen.value = false
}

// Per-action loading so saving the draft doesn't spin the approve button (both
// go through the shared isSaving under the hood).
const savingDraft = ref(false)
const approving = ref(false)

async function onSaveDraft() {
  savingDraft.value = true
  try {
    await saveDraft()
    toast.add({ title: t('pages.planner.savedDraftToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.planner.saveErrorTitle')), color: 'error' })
  } finally {
    savingDraft.value = false
  }
}

async function onApprove() {
  approving.value = true
  try {
    if (viewMode.value === 'matrix' && matrixDirty.value) await saveDraft()
    await approvePlan()
    toast.add({ title: t('pages.planner.approvedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.planner.approveErrorTitle')), color: 'error' })
  } finally {
    approving.value = false
  }
}

async function onUnapprove() {
  try {
    await unapprovePlan()
    toast.add({ title: t('pages.planner.unapprovedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.planner.approveErrorTitle')), color: 'error' })
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
    toast.add({ title: apiError.format(e, t('pages.planner.saveErrorTitle')), color: 'error' })
  }
}

async function onDeletePlan() {
  try {
    await deletePlan()
    toast.add({ title: t('pages.planner.planDeletedToast'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: apiError.format(e, t('pages.planner.saveErrorTitle')), color: 'error' })
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
  // A student may already be selected — e.g. deep-linked from the achievements
  // page's "View in planner". The selectedStudentId watch isn't immediate, so
  // load the plan here too.
  if (selectedStudentId.value) await loadPlan()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold">
          {{ t('pages.planner.title') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('pages.planner.subtitle') }}
        </p>
      </div>

      <div v-if="selectedHalaqaId && selectedStudentId" class="flex items-center gap-2 flex-wrap">
        <UBadge v-if="plan" variant="subtle" :color="statusBadgeColor" size="lg">
          {{ statusLabel }}
        </UBadge>
        <UButton
          v-if="canApprove && planStatus !== 'approved' && (planStatus === 'draft' || (viewMode === 'matrix' && matrixDirty))"
          icon="i-lucide-check-check"
          color="primary"
          :loading="approving"
          :disabled="savingDraft"
          @click="onApprove"
        >
          {{ t('pages.planner.approvePlan') }}
        </UButton>
        <UButton
          v-if="canUnapprovePlan && planStatus === 'approved'"
          icon="i-lucide-undo-2"
          color="warning"
          variant="soft"
          @click="onUnapprove"
        >
          {{ t('pages.planner.unapprove') }}
        </UButton>
        <UButton
          v-if="canPrint"
          icon="i-lucide-printer"
          color="neutral"
          variant="soft"
          @click="printOpen = true"
        >
          {{ t('pages.planner.downloadPdf') }}
        </UButton>
        <UButton
          v-if="canModify && viewMode === 'matrix'"
          icon="i-lucide-wand-sparkles"
          variant="soft"
          @click="wizardOpen = true"
        >
          {{ t('pages.planner.wizard.open') }}
        </UButton>
        <UButton
          v-if="canModify && viewMode === 'matrix'"
          icon="i-lucide-save"
          :loading="savingDraft"
          :disabled="!matrixDirty || approving"
          @click="onSaveDraft"
        >
          {{ t('pages.planner.saveDraft') }}
        </UButton>
        <UButton
          v-if="canModify && viewMode !== 'matrix'"
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

    <!-- Weekly plans are written per halaqa, so a halaqa is mandatory here even for
         roles that browse the rest of the app unscoped. -->
    <div
      v-if="!selectedHalaqaId"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ isHalaqaScoped ? t('common.selectHalaqaPrompt') : t('common.selectHalaqaToContinue') }}
      </p>
      <HalaqaFilter required />
    </div>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <PlannerFilterBar />
      </template>
      <PlannerResults />
    </UCard>

    <div
      v-if="selectedHalaqaId && selectedStudentId && viewMode === 'matrix'"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      <div class="rounded-xl border border-default bg-default p-3 text-center">
        <p class="text-lg font-bold tabular-nums">
          {{ matrixSummary.hifzAyahs }}
        </p>
        <p class="text-xs text-muted">
          {{ t('pages.planner.summary.totalMemAyahs') }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-default p-3 text-center">
        <p class="text-lg font-bold tabular-nums">
          {{ matrixSummary.reviewSessions }}
        </p>
        <p class="text-xs text-muted">
          {{ t('pages.planner.summary.reviewSessions') }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-default p-3 text-center">
        <p class="text-lg font-bold tabular-nums">
          {{ matrixSummary.plannedDays }}
        </p>
        <p class="text-xs text-muted">
          {{ t('pages.planner.summary.completedDays') }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-default p-3 text-center">
        <p class="text-lg font-bold tabular-nums">
          {{ matrixSummary.restDays }}
        </p>
        <p class="text-xs text-muted">
          {{ t('pages.planner.summary.restDays') }}
        </p>
      </div>
    </div>

    <PlannerCreateWizard />

    <PlannerPrintDialog v-model:open="printOpen" :plan="pdfPlan" />

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
