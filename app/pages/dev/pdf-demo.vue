<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import QuranPlan, { type QuranPlanProps } from '~/components/pdf/QuranPlan.vue'

// Demo page for the printable memorization plan: shows a WYSIWYG browser
// preview, an approved and a non-approved example, and a "download PDF" button
// per plan. All data is dynamic — passed as props exactly like production use.

// Demo lives under /dev/* so it bypasses the global auth middleware, and uses
// the chrome-free `none` layout so the preview stands alone.
definePageMeta({ layout: 'none' })

const { exportPdf, isExporting } = usePdf()

// A5 block natural size in CSS pixels (210mm × 148.5mm @ 96dpi) — used to
// compute the preview scale so the fixed-size plan fits any viewport width.
const PLAN_W_PX = (210 / 25.4) * 96
const PLAN_H_PX = (148.5 / 25.4) * 96

const sampleRows = [
  { day: 'السبت', date: '2026/07/24', memorization: 'يوسف 53 - 64', majorReview: 'هود 1 - 50', minorReview: 'يونس 1 - 25' },
  { day: 'الأحد', date: '2026/07/25', memorization: 'يوسف 65 - 78', majorReview: 'هود 51 - 100', minorReview: 'يونس 26 - 50' },
  { day: 'الاثنين', date: '2026/07/26', memorization: 'يوسف 79 - 92', majorReview: 'هود 101 - 123', minorReview: 'يونس 51 - 75' },
  { day: 'الثلاثاء', date: '2026/07/27', memorization: 'يوسف 93 - 111', majorReview: 'يوسف 1 - 52', minorReview: 'يونس 76 - 109' },
  { day: 'الأربعاء', date: '2026/07/28', memorization: 'الرعد 1 - 13', majorReview: 'الرعد 1 - 43', minorReview: 'يوسف 1 - 50' },
  { day: 'الخميس', date: '2026/07/29', memorization: 'الرعد 14 - 29', majorReview: 'إبراهيم 1 - 52', minorReview: 'يوسف 51 - 111' }
]

// Two independent plans, each with its own capture id.
const plans = ref<(QuranPlanProps & { id: string })[]>([
  {
    id: 'quran-plan-approved',
    elementId: 'quran-plan-approved',
    studentName: 'أحمد محمد العتيبي',
    approved: true,
    logo: '/images/logo/halaqa_logo.png',
    completionText: 'من يوسف إلى الحجر + من القصص إلى الجنابة',
    rows: sampleRows
  },
  {
    id: 'quran-plan-draft',
    elementId: 'quran-plan-draft',
    studentName: 'خالد سعد الدوسري',
    approved: false,
    logo: '/images/logo/halaqa_logo.png',
    completionText: 'من الكهف إلى طه',
    rows: sampleRows.slice(0, 4)
  }
])

async function download(plan: QuranPlanProps & { id: string }) {
  await exportPdf(plan.id, {
    fileName: `خطة-الحافظ-${plan.studentName}`,
    scale: 3,
    wordSpacing: '0.18em'
  })
}

// ── Responsive preview scaling ────────────────────────────────────────────
// The plan renders at a fixed A5 size; we scale the whole block down to fit the
// available column width (never up past 1:1). Because the scale lives on a
// wrapper transform, the export still captures at full resolution.
const shell = useTemplateRef<HTMLElement>('shell')
const { width: shellWidth } = useElementSize(shell)
const scale = computed(() => (shellWidth.value ? Math.min(shellWidth.value / PLAN_W_PX, 1) : 1))
const previewHeight = computed(() => PLAN_H_PX * scale.value)
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">
        خطة الحافظ — معاينة وطباعة
      </h1>
      <p class="text-muted mt-1">
        معاينة مطابقة تمامًا للملف المُصدَّر (A4 عمودي، الخطة في النصف العلوي).
      </p>
    </div>

    <div ref="shell" class="flex flex-col gap-10">
      <section v-for="plan in plans" :key="plan.id" class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ plan.studentName }}</span>
            <UBadge :color="plan.approved ? 'success' : 'neutral'" variant="subtle">
              {{ plan.approved ? 'معتمدة' : 'مسودة' }}
            </UBadge>
          </div>
          <UButton
            icon="i-lucide-download"
            :loading="isExporting"
            @click="download(plan)"
          >
            تحميل PDF
          </UButton>
        </div>

        <!-- WYSIWYG preview: fixed-size plan scaled to fit the column -->
        <div
          class="qp-preview-shell"
          :style="{ height: `${previewHeight}px` }"
        >
          <div
            class="qp-preview-scaler"
            :style="{ transform: `scale(${scale})` }"
          >
            <QuranPlan v-bind="plan" />
          </div>
        </div>
      </section>
    </div>
  </UContainer>
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
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}

.qp-preview-scaler {
  transform-origin: top center;
  width: fit-content;
}
</style>
