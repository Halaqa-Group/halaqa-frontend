<script setup lang="ts">
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import { weeklyPlanToQuranPlan } from '~/utils/plan-pdf'
import { dateOfDayLabel } from '~/utils/plan'

definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.planner.title' }
  ]
})

const { t, locale } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { canApprovePlan, canEditPlanItems, canDeletePlan, canUnapprovePlan } = usePermissions()
const { selectedHalaqaId, ensureHalaqaSelected } = useGlobalHalaqa()
const {
  selectedStudentId, selectedWeekStart, plan, planStatus, viewMode,
  formOpen, editing, deleteOpen, deleteTarget,
  wizardOpen, matrixDirty, matrixSummary, saveDraft, dateOfDay, studentName,
  copiedPlan, hasDraftContent, copyWholePlan, pasteWholePlan,
  loadStudents, loadPlan, approvePlan, unapprovePlan, deletePlan, deleteItem, openAdd
} = useWeeklyPlan()

// Creating a plan, approving it, and every plan-item mutation share one check —
// halaqa scope — and the planner only ever loads a halaqa the caller is in.
const canApprove = canApprovePlan
const canModify = computed(() => canEditPlanItems.value && planStatus.value !== 'approved')

// Copying a plan is read-only, so it stays available even after approval — an
// approved plan is exactly the polished one a teacher most wants to reuse for
// another student or an upcoming week. Pasting still writes, so it keeps the
// canModify gate: you can only paste onto an editable (non-approved) target.
const canCopyPlan = computed(() =>
  canEditPlanItems.value && viewMode.value === 'matrix' && hasDraftContent.value
)

const formRef = useTemplateRef<{ saving: Ref<boolean> } | null>('formRef')
const formSaving = computed(() => formRef.value?.saving.value ?? false)

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

// ── Whole-plan copy / paste ──────────────────────────────────────────────────
// Copy the current week's matrix into a module-level clipboard, then paste it onto
// another student or another week. The clipboard survives switching the selected
// student and navigating weeks, which is what makes "copy student A → student B" and
// "copy a past week → an upcoming week" a single flow.
function onCopyPlan() {
  const source = [
    selectedStudentId.value ? studentName(selectedStudentId.value) : '',
    dateOfDayLabel(new Date(selectedWeekStart.value), locale.value)
  ].filter(Boolean).join(' · ')
  if (!copyWholePlan(source)) return
  toast.add({ title: t('pages.planner.planCopiedToast'), color: 'success' })
}

const pastePlanOpen = ref(false)
function onPastePlanClick() {
  if (!copiedPlan.value) return
  // Overwriting a week that already carries sessions is destructive, so confirm
  // first. An empty week just takes the paste immediately.
  if (hasDraftContent.value) pastePlanOpen.value = true
  else applyPastePlan()
}
function applyPastePlan() {
  if (!pasteWholePlan()) return
  toast.add({ title: t('pages.planner.planPastedToast'), color: 'success' })
}

// ── Toolbar hierarchy ────────────────────────────────────────────────────────
// One labeled primary action stays visible at every breakpoint; the rest are
// inline buttons on sm+ and fold into an overflow menu on mobile. This keeps the
// phone toolbar to "[primary] ⋮" instead of a wrapped block of equal-weight pills.
const showApprove = computed(() =>
  canApprove.value && planStatus.value !== 'approved'
  && (planStatus.value === 'draft' || (viewMode.value === 'matrix' && matrixDirty.value))
)
const showUnapprove = computed(() => canUnapprovePlan.value && planStatus.value === 'approved')

// First available of [approve, add, save draft] leads; everything else is secondary.
const primaryKey = computed<'approve' | 'add' | 'saveDraft' | null>(() => {
  if (showApprove.value) return 'approve'
  if (canModify.value && viewMode.value !== 'matrix') return 'add'
  if (canModify.value && viewMode.value === 'matrix') return 'saveDraft'
  return null
})

// Mobile overflow: the secondary actions that are inline buttons on desktop,
// plus the delete group. Approve is never here — it's the primary button.
const mobileMenu = computed(() => {
  const secondary = []
  if (showUnapprove.value)
    secondary.push({ label: t('pages.planner.unapprove'), icon: 'i-lucide-undo-2', onSelect: onUnapprove })
  if (canPrint.value)
    secondary.push({ label: t('pages.planner.downloadPdf'), icon: 'i-lucide-printer', onSelect: () => { printOpen.value = true } })
  if (canModify.value && viewMode.value === 'matrix')
    secondary.push({ label: t('pages.planner.wizard.open'), icon: 'i-lucide-wand-sparkles', onSelect: () => { wizardOpen.value = true } })
  // Copy survives approval; paste and save do not.
  if (canCopyPlan.value)
    secondary.push({ label: t('pages.planner.copyPlan'), icon: 'i-lucide-clipboard-copy', onSelect: onCopyPlan })
  if (canModify.value && viewMode.value === 'matrix') {
    if (copiedPlan.value)
      secondary.push({
        label: copiedPlan.value.label
          ? t('pages.planner.pastePlanFrom', { source: copiedPlan.value.label })
          : t('pages.planner.pastePlan'),
        icon: 'i-lucide-clipboard-paste',
        onSelect: onPastePlanClick
      })
    if (primaryKey.value !== 'saveDraft')
      secondary.push({ label: t('pages.planner.saveDraft'), icon: 'i-lucide-save', disabled: !matrixDirty.value, onSelect: onSaveDraft })
  }
  if (canModify.value && viewMode.value !== 'matrix' && primaryKey.value !== 'add')
    secondary.push({ label: t('pages.planner.addItem'), icon: 'i-lucide-plus', onSelect: openAdd })

  const groups: any[] = []
  if (secondary.length) groups.push(secondary)
  if (planMenu.value.length) groups.push(...planMenu.value)
  return groups
})

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

// Unscoped roles (principal, supervisor…) arrive here with no halaqa picked. Since
// the page can't work without one, default to the first halaqa they are assigned to
// rather than parking them on the empty state — the filter bar still lets them switch.
// Only reaches the empty state when they have no halaqa at all.
const resolvingHalaqa = ref(false)

async function autoSelectHalaqa() {
  resolvingHalaqa.value = true
  try {
    // Selecting fires the watch below, which loads that halaqa's students.
    await ensureHalaqaSelected()
  } finally {
    resolvingHalaqa.value = false
  }
}

watch(selectedHalaqaId, async (id) => {
  selectedStudentId.value = undefined
  plan.value = null
  if (id) {
    await loadStudents(id)
    return
  }
  // Switching roles re-resolves the global scope to "unscoped"; re-pin so the
  // planner never sits without a halaqa.
  await autoSelectHalaqa()
})
watch(selectedStudentId, () => loadPlan())
watch(selectedWeekStart, () => loadPlan())

onMounted(async () => {
  if (!selectedHalaqaId.value) {
    await autoSelectHalaqa()
    return
  }
  await loadStudents(selectedHalaqaId.value)
  // A student may already be selected — e.g. deep-linked from the achievements
  // page's "View in planner". The selectedStudentId watch isn't immediate, so
  // load the plan here too.
  if (selectedStudentId.value) await loadPlan()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Weekly plans are written per halaqa, so a halaqa is mandatory here even for
         roles that browse the rest of the app unscoped. -->
    <div
      v-if="resolvingHalaqa"
      class="flex items-center justify-center py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div
      v-else-if="!selectedHalaqaId"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <PlannerFilterBar>
        <template #pageActions>
          <div v-if="selectedStudentId && viewMode !== 'day'" class="flex items-center gap-2">
            <!-- Approve — the decisive action; primary and visible at every breakpoint -->
            <UButton
              v-if="showApprove"
              icon="i-lucide-check-check"
              color="primary"
              :loading="approving"
              :disabled="savingDraft"
              @click="onApprove"
            >
              {{ t('pages.planner.approvePlan') }}
            </UButton>

            <!-- Secondary actions: inline on sm+, folded into the overflow menu on mobile -->
            <UButton
              v-if="showUnapprove"
              class="hidden sm:inline-flex"
              icon="i-lucide-undo-2"
              color="warning"
              variant="soft"
              @click="onUnapprove"
            >
              {{ t('pages.planner.unapprove') }}
            </UButton>
            <UButton
              v-if="canPrint"
              class="hidden sm:inline-flex"
              icon="i-lucide-printer"
              color="neutral"
              variant="soft"
              @click="printOpen = true"
            >
              {{ t('pages.planner.downloadPdf') }}
            </UButton>
            <UButton
              v-if="canModify && viewMode === 'matrix'"
              class="hidden sm:inline-flex"
              icon="i-lucide-wand-sparkles"
              variant="soft"
              @click="wizardOpen = true"
            >
              {{ t('pages.planner.wizard.open') }}
            </UButton>
            <UButton
              v-if="canCopyPlan"
              class="hidden sm:inline-flex"
              icon="i-lucide-clipboard-copy"
              color="neutral"
              variant="soft"
              @click="onCopyPlan"
            >
              {{ t('pages.planner.copyPlan') }}
            </UButton>
            <UButton
              v-if="canModify && viewMode === 'matrix' && copiedPlan"
              class="hidden sm:inline-flex"
              icon="i-lucide-clipboard-paste"
              color="primary"
              variant="soft"
              :title="copiedPlan.label ? t('pages.planner.pastePlanFrom', { source: copiedPlan.label }) : undefined"
              @click="onPastePlanClick"
            >
              {{ t('pages.planner.pastePlan') }}
            </UButton>
            <UButton
              v-if="canModify && viewMode === 'matrix'"
              :class="primaryKey === 'saveDraft' ? '' : 'hidden sm:inline-flex'"
              icon="i-lucide-save"
              :loading="savingDraft"
              :disabled="!matrixDirty || approving"
              @click="onSaveDraft"
            >
              {{ t('pages.planner.saveDraft') }}
            </UButton>
            <UButton
              v-if="canModify && viewMode !== 'matrix'"
              :class="primaryKey === 'add' ? '' : 'hidden sm:inline-flex'"
              icon="i-lucide-plus"
              @click="openAdd"
            >
              {{ t('pages.planner.addItem') }}
            </UButton>

            <!-- Overflow: mobile carries the secondary actions + delete; desktop only delete -->
            <UDropdownMenu v-if="mobileMenu.length" :items="mobileMenu" :content="{ align: 'end' }" class="sm:hidden">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" square :aria-label="t('pages.planner.table.actions')" />
            </UDropdownMenu>
            <UDropdownMenu v-if="planMenu.length" :items="planMenu" :content="{ align: 'end' }" class="hidden sm:block">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" square :aria-label="t('pages.planner.table.actions')" />
            </UDropdownMenu>
          </div>
        </template>
      </PlannerFilterBar>
      <PlannerResults />
    </template>

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

    <ConfirmDialog
      v-model:open="pastePlanOpen"
      :title="t('pages.planner.pastePlanConfirm.title')"
      :message="t('pages.planner.pastePlanConfirm.message')"
      destructive
      :confirm-label="t('pages.planner.pastePlan')"
      @confirm="applyPastePlan"
    />
  </div>
</template>
