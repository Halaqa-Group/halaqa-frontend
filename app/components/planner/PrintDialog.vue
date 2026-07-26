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
const { exportPdf, exportPng, sharePng } = usePdf()

// Which export is in flight, so each button shows its OWN spinner. The shared
// `isExporting` from usePdf would light up both buttons at once.
const exportingKind = ref<'pdf' | 'image' | 'share' | null>(null)

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

// Share the plan image itself via the native share sheet — on a phone that lists
// WhatsApp for a one-tap send. Desktop browsers can't share files, so we fall back
// to downloading the PNG for the teacher to attach manually.
async function shareWhatsApp() {
  if (exportingKind.value) return
  exportingKind.value = 'share'
  try {
    const result = await sharePng(PLAN_PDF_ELEMENT_ID, {
      fileName: fileName.value,
      scale: 3,
      wordSpacing: '0.18em',
      title: t('pages.planner.print.shareTitle'),
      text: t('pages.planner.print.shareText', { student: props.plan.studentName })
    })
    if (result === 'unsupported') {
      await exportPng(PLAN_PDF_ELEMENT_ID, { fileName: fileName.value, scale: 3, wordSpacing: '0.18em' })
      toast.add({ title: t('pages.planner.print.shareFallback'), color: 'info' })
    }
  } catch {
    toast.add({ title: t('pages.planner.print.shareError'), color: 'error' })
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
          color="success"
          variant="soft"
          :loading="exportingKind === 'share'"
          :disabled="!hasRows || exportingKind !== null"
          @click="shareWhatsApp"
        >
          <template #leading>
            <svg
              v-if="exportingKind !== 'share'"
              viewBox="0 0 24 24"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fill="#25D366"
                d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.523 5.29l-.999 3.648 3.65-.958zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
              />
            </svg>
          </template>
          {{ t('pages.planner.print.shareWhatsApp') }}
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
