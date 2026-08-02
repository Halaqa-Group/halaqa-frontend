<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import QuranPlan, { type QuranPlanProps } from '~/components/pdf/QuranPlan.vue'
import type { PreparedExports } from '~/composables/usePdf'
import { PLAN_PDF_ELEMENT_ID } from '~/utils/plan-pdf'

// Print-preview dialog for a mapped weekly plan. Shows a WYSIWYG, responsively
// scaled A5 preview and exports it to PDF via the shared `usePdf` composable.
// The `plan` prop is already-mapped `QuranPlanProps` (see utils/plan-pdf).

const props = defineProps<{ plan: QuranPlanProps }>()
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()
const { renderExports, saveBlob, canShareBlob, shareBlob } = usePdf()

const hasRows = computed(() => props.plan.rows.length > 0)

// A5 natural size in CSS px (210mm × 148.5mm @ 96dpi) → preview scale factor.
const PLAN_W_PX = (210 / 25.4) * 96
const PLAN_H_PX = (148.5 / 25.4) * 96
const shell = useTemplateRef<HTMLElement>('shell')
const { width: shellWidth } = useElementSize(shell)
const scale = computed(() => (shellWidth.value ? Math.min(shellWidth.value / PLAN_W_PX, 1) : 1))
const previewHeight = computed(() => PLAN_H_PX * scale.value)

const fileName = computed(() => `${t('pages.planner.print.fileName')}-${props.plan.studentName}`)

// ── Pre-rendered exports ──────────────────────────────────────────────────
// Both files are rendered as soon as the dialog opens, NOT when a button is
// clicked. Safari (macOS + iOS) only allows a download or `navigator.share()`
// while the page holds a transient user activation, and the multi-second
// html2canvas capture consumed it — which is why every button silently did
// nothing there. With the blobs ready, each handler stays synchronous.
const exports = shallowRef<PreparedExports | null>(null)
const isPreparing = ref(false)
// The share sheet is busy until the user picks a target / dismisses it.
const isSharing = ref(false)

const isReady = computed(() => exports.value !== null)

async function prepareExports() {
  if (!hasRows.value) return
  isPreparing.value = true
  try {
    // Let the modal body (and the plan inside it) commit to the DOM first.
    await nextTick()
    exports.value = await renderExports(PLAN_PDF_ELEMENT_ID, {
      scale: 3,
      wordSpacing: '0.18em'
    })
  } catch (err) {
    // Surfaced immediately rather than on click: a failed capture is the one
    // case where the buttons genuinely cannot work, and the console detail is
    // what makes a device-specific failure debuggable.
    console.error('[PrintDialog] could not prepare the plan exports', err)
    toast.add({ description: t('pages.planner.print.error'), color: 'error' })
  } finally {
    isPreparing.value = false
  }
}

// Re-render whenever the dialog opens or the plan behind it changes.
watch(
  () => [open.value, props.plan] as const,
  ([isOpen]) => {
    exports.value = null
    if (isOpen) void prepareExports()
  },
  { deep: true, flush: 'post' }
)

// NOTE: every handler below must reach `saveBlob`/`shareBlob` without awaiting
// anything first — see the comment on `exports`.

function download() {
  const blob = exports.value?.pdf
  if (!blob) return
  saveBlob(blob, `${fileName.value}.pdf`)
}

function downloadImage() {
  const blob = exports.value?.png
  if (!blob) return
  saveBlob(blob, `${fileName.value}.png`)
}

// Share the plan image itself via the native share sheet — on a phone that lists
// WhatsApp for a one-tap send. Browsers without file sharing (most desktops, and
// any page served over plain http) fall back to downloading the PNG so the
// teacher can attach it manually.
function shareWhatsApp() {
  const blob = exports.value?.png
  if (!blob || isSharing.value) return
  const name = `${fileName.value}.png`

  // Checked synchronously so the fallback download still runs inside the click.
  if (!canShareBlob(blob, name)) {
    saveBlob(blob, name)
    toast.add({ description: t('pages.planner.print.shareFallback'), color: 'info' })
    return
  }

  isSharing.value = true
  shareBlob(blob, {
    fileName: name,
    title: t('pages.planner.print.shareTitle'),
    text: t('pages.planner.print.shareText', { student: props.plan.studentName })
  })
    .catch((err) => {
      console.error('[PrintDialog] share failed', err)
      toast.add({ description: t('pages.planner.print.shareError'), color: 'error' })
    })
    .finally(() => {
      isSharing.value = false
    })
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
      <!--
        Phones: one full-width button per line (`flex-col-reverse` keeps the
        primary PDF action on top and "close" at the bottom), so the Arabic
        labels stop wrapping into two cramped lines. sm+ keeps the classic
        right-aligned row.
      -->
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          class="w-full sm:w-auto justify-center"
          @click="open = false"
        >
          {{ t('common.close') }}
        </UButton>
        <!--
          The exports are rendered up-front (see `exports`), which takes a beat.
          Three simultaneous button spinners read as "everything is broken", so the
          actions are stood in for by skeletons until the blobs exist — only إغلاق
          stays live, since closing never waits on a capture.
        -->
        <template v-if="isPreparing">
          <USkeleton class="h-8 w-full sm:w-40 rounded-md" />
          <USkeleton class="h-8 w-full sm:w-36 rounded-md" />
          <USkeleton class="h-8 w-full sm:w-28 rounded-md" />
        </template>

        <template v-else>
          <UButton
            color="success"
            variant="soft"
            class="w-full sm:w-auto justify-center"
            :loading="isSharing"
            :disabled="!hasRows || !isReady || isSharing"
            @click="shareWhatsApp"
          >
            <template #leading>
              <svg
                v-if="!isSharing"
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
            class="w-full sm:w-auto justify-center"
            :disabled="!hasRows || !isReady"
            @click="downloadImage"
          >
            {{ t('pages.planner.print.downloadImage') }}
          </UButton>
          <UButton
            icon="i-lucide-download"
            class="w-full sm:w-auto justify-center"
            :disabled="!hasRows || !isReady"
            @click="download"
          >
            {{ t('pages.planner.print.download') }}
          </UButton>
        </template>
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
  /*
   * `transform: scale()` shrinks the plan visually but NOT its layout box, which
   * stays a full 210mm wide. As a flex item that box would otherwise be shrunk
   * to the shell width on a phone, moving `top center` off the plan's real centre
   * and pushing the preview sideways. Never shrink it — the shell clips the
   * overflow symmetrically instead.
   */
  flex: 0 0 auto;
}
</style>
