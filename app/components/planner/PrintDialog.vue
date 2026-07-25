<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import QuranPlan, { type QuranPlanProps } from '~/components/pdf/QuranPlan.vue'
import { PLAN_PDF_ELEMENT_ID } from '~/utils/plan-pdf'

// Print-preview dialog for a mapped weekly plan. Shows a WYSIWYG, responsively
// scaled A5 preview and exports it to PDF via the shared `usePdf` composable.
// The `plan` prop is already-mapped `QuranPlanProps` (see utils/plan-pdf).

const props = defineProps<{ plan: QuranPlanProps }>()
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()
const { exportPdf, exportPng } = usePdf()

// Which export is in flight, so each button shows its OWN spinner. The shared
// `isExporting` from usePdf would light up both buttons at once.
const exportingKind = ref<'pdf' | 'image' | null>(null)

const hasRows = computed(() => props.plan.rows.length > 0)

// A5 natural size in CSS px (210mm × 148.5mm @ 96dpi) → preview scale factor.
const PLAN_W_PX = (210 / 25.4) * 96
const PLAN_H_PX = (148.5 / 25.4) * 96
const shell = useTemplateRef<HTMLElement>('shell')
const { width: shellWidth } = useElementSize(shell)
const scale = computed(() => (shellWidth.value ? Math.min(shellWidth.value / PLAN_W_PX, 1) : 1))
const previewHeight = computed(() => PLAN_H_PX * scale.value)

const fileName = computed(() => `${t('pages.planner.print.fileName')}-${props.plan.studentName}`)

async function download() {
  if (exportingKind.value) return
  exportingKind.value = 'pdf'
  try {
    await exportPdf(PLAN_PDF_ELEMENT_ID, {
      fileName: fileName.value,
      scale: 3,
      wordSpacing: '0.18em'
    })
  } catch {
    toast.add({ title: t('pages.planner.print.error'), color: 'error' })
  } finally {
    exportingKind.value = null
  }
}

async function downloadImage() {
  if (exportingKind.value) return
  exportingKind.value = 'image'
  try {
    await exportPng(PLAN_PDF_ELEMENT_ID, {
      fileName: fileName.value,
      scale: 3,
      wordSpacing: '0.18em'
    })
  } catch {
    toast.add({ title: t('pages.planner.print.errorImage'), color: 'error' })
  } finally {
    exportingKind.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('pages.planner.print.title')"
    :ui="{ content: 'sm:max-w-3xl rounded-2xl' }"
  >
    <template #body>
      <div v-if="hasRows" ref="shell" class="flex flex-col gap-4">
        <div class="qp-preview-shell" :style="{ height: `${previewHeight}px` }">
          <div class="qp-preview-scaler" :style="{ transform: `scale(${scale})` }">
            <QuranPlan v-bind="plan" />
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center gap-3 py-10 text-center">
        <UIcon name="i-lucide-file-x" class="w-10 h-10 text-muted" />
        <p class="text-sm text-muted">
          {{ t('pages.planner.print.empty') }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="open = false">
          {{ t('common.close') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-image-down"
          :loading="exportingKind === 'image'"
          :disabled="!hasRows || exportingKind !== null"
          @click="downloadImage"
        >
          {{ t('pages.planner.print.downloadImage') }}
        </UButton>
        <UButton
          icon="i-lucide-download"
          :loading="exportingKind === 'pdf'"
          :disabled="!hasRows || exportingKind !== null"
          @click="download"
        >
          {{ t('pages.planner.print.download') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.qp-preview-shell {
  width: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: #eef2f6;
}

.qp-preview-scaler {
  transform-origin: top center;
  width: fit-content;
}
</style>
