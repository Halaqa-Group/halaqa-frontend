<script setup lang="ts">
/**
 * QuranPlan — a printable Quran memorization plan ("خطة الحافظ").
 *
 * Renders as a fixed A5 block (210mm × 148.5mm) that occupies the upper half of
 * an A4 portrait page; the lower half is left blank for printing. The on-screen
 * preview is byte-for-byte what `usePdf().exportPdf()` captures, so the design
 * stays WYSIWYG. Every value is a prop — nothing is hard-coded — which keeps the
 * template reusable across students and halaqat.
 *
 * Responsive sizing is the parent's job: wrap this component in a
 * `transform: scale()` container. html2canvas-pro captures the element's own
 * layout box, so ancestor scaling never degrades export resolution.
 */

export interface QuranPlanRow {
  /** Day label, e.g. "السبت". */
  day: string
  /** Date label, e.g. "1446/07/24". */
  date: string
  /** New memorization for the day (الحفظ). */
  memorization: string
  /** Far-review range — shown under مراجعة بعيد (mapped from the Far track). */
  majorReview?: string
  /** Near-review range — shown under مراجعة قريب (mapped from the Near track). */
  minorReview?: string
}

export interface QuranPlanProps {
  /** Student the plan belongs to. */
  studentName: string
  /** When true, renders the "تم الاعتماد" approval stamp. */
  approved: boolean
  /** Optional logo shown beside the title. Any image URL / data URI. */
  logo?: string
  /** Optional stamp image; falls back to a styled text stamp when omitted. */
  stampImage?: string
  /** Summary of what the plan completes, shown under "الإنجاز". */
  completionText: string
  /** Table body rows — any number is supported. */
  rows: QuranPlanRow[]
  /** DOM id used by `usePdf().exportPdf(id)`. */
  elementId?: string
}

withDefaults(defineProps<QuranPlanProps>(), {
  logo: '',
  stampImage: '',
  elementId: 'quran-plan'
})
</script>

<template>
  <div :id="elementId" class="quran-plan" dir="rtl">
    <div class="qp-frame">
      <!-- Header: logo beside the title, student name underneath -->
      <header class="qp-header">
        <img v-if="logo" :src="logo" alt="" class="qp-logo">
        <div class="qp-titles">
          <h1 class="qp-title">
            خطة الحافظ
          </h1>
          <p class="qp-student">
            <span class="qp-student-label">الطالب:</span>
            <span class="qp-student-name">{{ studentName }}</span>
          </p>
        </div>
        <!-- Spacer keeps the title visually centred when a logo is present -->
        <span v-if="logo" class="qp-logo qp-logo--ghost" aria-hidden="true" />
      </header>

      <!-- Plan table -->
      <table class="qp-table">
        <thead>
          <tr>
            <th class="qp-col-day">
              <span class="qp-cc">اليوم</span>
            </th>
            <th class="qp-col-date">
              <span class="qp-cc">التاريخ</span>
            </th>
            <th><span class="qp-cc">الحفظ</span></th>
            <th><span class="qp-cc">مراجعة قريب</span></th>
            <th><span class="qp-cc">مراجعة بعيد</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td class="qp-cell-day">
              <span class="qp-cc">{{ row.day }}</span>
            </td>
            <td class="qp-cell-date">
              <span class="qp-cc">{{ row.date }}</span>
            </td>
            <td><span class="qp-cc">{{ row.memorization }}</span></td>
            <td><span class="qp-cc">{{ row.minorReview || '—' }}</span></td>
            <td><span class="qp-cc">{{ row.majorReview || '—' }}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Completion (الإنجاز) -->
      <div class="qp-completion">
        <span class="qp-completion-label"><span class="qp-run">الإنجاز</span></span>
        <span class="qp-completion-text"><span class="qp-run">{{ completionText }}</span></span>
      </div>

      <!-- Footer: parent signature + optional approval stamp -->
      <footer class="qp-footer">
        <div class="qp-signature">
          <span class="qp-signature-label">توقيع ولي الأمر</span>
          <span class="qp-signature-line" aria-hidden="true" />
        </div>

        <div v-if="approved" class="qp-stamp">
          <img v-if="stampImage" :src="stampImage" alt="تم الاعتماد" class="qp-stamp-img">
          <span v-else class="qp-stamp-text"><span class="qp-run">تم الاعتماد</span></span>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/*
 * All dimensions are in millimetres so the layout maps 1:1 onto paper, and all
 * colours are literal hex (no oklch / CSS-var indirection) so html2canvas-pro
 * reproduces them exactly during capture.
 */
.quran-plan {
  --qp-blue: #1c5b9c;
  --qp-blue-header: #dbe8f6;
  --qp-blue-line: #b9cfe6;
  --qp-yellow: #fdeec3;
  --qp-yellow-line: #e6c46a;
  --qp-ink: #17324d;
  --qp-muted: #5b6b7b;
  --qp-stamp: #1a6b4a;
  --qp-zebra: #f4f8fd;

  /* A5 block on the upper half of an A4 portrait sheet */
  --qp-w: 210mm;
  --qp-h: 148.5mm;

  width: var(--qp-w);
  /*
   * `min-height` (not a fixed `height`) so a long plan grows downward instead of
   * clipping: with a fixed height the frame kept its 148.5mm box and any content
   * past it (extra rows) pushed the footer — signature + stamp — outside the
   * border. The block still fills the upper-half A5 for short plans; it only
   * grows when the rows need it, and the export just places a slightly taller
   * image at the top of the A4 sheet. Flex column + `.qp-frame { flex: 1 }` lets
   * the frame fill this min-height and keeps the completion/footer pinned to the
   * bottom (via the completion's margin-top: auto).
   */
  min-height: var(--qp-h);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: #ffffff;
  font-family: 'Thmanyah Sans', system-ui, sans-serif;
  color: var(--qp-ink);
  padding: 6mm;
}

.quran-plan *,
.quran-plan *::before,
.quran-plan *::after {
  box-sizing: border-box;
}

.qp-frame {
  width: 100%;
  /* Fill the parent's min-height (grows with content); see .quran-plan */
  flex: 1 1 auto;
  border: 1.2mm solid var(--qp-blue);
  border-radius: 2mm;
  padding: 4mm 5mm 5mm;
  display: flex;
  flex-direction: column;
  gap: 3mm;
}

/* ── Header ─────────────────────────────────────────────── */
.qp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4mm;
  background: var(--qp-blue-header);
  border: 0.4mm solid var(--qp-blue-line);
  border-radius: 1.5mm;
  padding: 3mm 5mm;
}

.qp-logo {
  width: 16mm;
  height: 16mm;
  object-fit: contain;
  flex-shrink: 0;
}

.qp-logo--ghost {
  visibility: hidden;
}

.qp-titles {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1mm;
}

.qp-title {
  font-size: 8mm;
  font-weight: 800;
  color: var(--qp-blue);
  line-height: 1.1;
  margin: 0;
}

.qp-student {
  font-size: 4mm;
  margin: 0;
  color: var(--qp-ink);
}

.qp-student-label {
  color: var(--qp-muted);
  margin-inline-end: 1.5mm;
}

.qp-student-name {
  font-weight: 700;
}

/* ── Table ──────────────────────────────────────────────── */
/*
 * The table takes its natural height (flex: none) and every row shrink-wraps its
 * content (see .qp-cc), so a short plan no longer stretches its rows to fill the
 * page — the leftover space falls below the table (the completion block is
 * pinned to the bottom via margin-top: auto).
 */
.qp-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  flex: none;
  font-size: 3.6mm;
}

.qp-table th,
.qp-table td {
  border: 0.35mm solid var(--qp-blue-line);
  padding: 0;
  text-align: center;
  vertical-align: middle;
  word-break: break-word;
}

/*
 * Flex-centre each cell's text and let this box define the row height. We
 * shrink-wrap (own content + symmetric padding, no fixed cell height) because
 * html2canvas won't resolve `height: 100%` on a flex child inside a <td> nor
 * honour `vertical-align: middle` on the cell.
 *
 * This symmetric padding centres the text in the *browser preview*. The exported
 * raster needs an extra nudge (html2canvas draws Arabic low in the line-box) —
 * that lives in the `[data-pdf-capture]` block near the end of this file so it
 * only affects the capture, never the preview.
 */
.qp-cc {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 6mm;
  line-height: 1.2;
  padding: 1.5mm 2.5mm;
}

.qp-table thead th {
  background: var(--qp-blue-header);
  color: var(--qp-blue);
  font-weight: 700;
  font-size: 3.7mm;
}

.qp-table tbody tr:nth-child(even) {
  background: var(--qp-zebra);
}

.qp-col-day,
.qp-cell-day {
  width: 20mm;
  font-weight: 700;
}

.qp-col-date,
.qp-cell-date {
  width: 30mm;
  color: var(--qp-muted);
  font-variant-numeric: tabular-nums;
}

/* ── Completion (الإنجاز) ───────────────────────────────── */
/*
 * The band shrink-wraps its content (no min-height) so it is exactly
 * content + padding, and `align-items: stretch` turns the label's trailing
 * border into a full-height divider. The label + text centre naturally in the
 * browser preview; the capture-only nudge for html2canvas's low Arabic baseline
 * lives in the `[data-pdf-capture]` block near the end of this file.
 */
.qp-completion {
  /* Pin the completion + signature block to the bottom of the frame, leaving
     any spare vertical space as a gap below the table rows. */
  margin-top: auto;
  display: flex;
  align-items: stretch;
  gap: 3mm;
  background: var(--qp-yellow);
  border: 0.4mm solid var(--qp-yellow-line);
  border-radius: 1.5mm;
  padding: 2.6mm 4mm;
}

.qp-completion-label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  line-height: 1;
  font-weight: 800;
  font-size: 4mm;
  color: #8a6d1a;
  padding-inline-end: 3mm;
  border-inline-end: 0.4mm solid var(--qp-yellow-line);
}

.qp-completion-text {
  display: flex;
  align-items: center;
  line-height: 1.25;
  font-size: 3.7mm;
  font-weight: 600;
  color: var(--qp-ink);
}

/*
 * Text run wrapper. html2canvas-pro does NOT draw space glyphs — it draws each
 * word at bounds it reads back via Range.getClientRects(). When the text node
 * sits *directly* inside a flex/inline-flex box, that measurement collapses the
 * inter-word gap (word-spacing isn't reflected), so multi-word Arabic renders as
 * "منالفاتحة" / "تمالاعتماد" in the exported PNG/PDF even though the live
 * preview looks fine. Wrapping the text in this plain inline run gives the text
 * node a non-flex parent, so the gaps measure correctly again. Any flex box that
 * holds real (space-separated) text directly must route it through .qp-run.
 */
.qp-run {
  display: inline;
}

/* ── Footer ─────────────────────────────────────────────── */
.qp-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6mm;
  padding-top: 1mm;
}

.qp-signature {
  display: flex;
  flex-direction: column;
  gap: 2mm;
  min-width: 60mm;
}

.qp-signature-label {
  font-size: 3.6mm;
  font-weight: 700;
  color: var(--qp-muted);
}

.qp-signature-line {
  display: block;
  height: 0;
  border-bottom: 0.4mm dotted var(--qp-ink);
  width: 60mm;
}

.qp-stamp {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qp-stamp-img {
  width: 26mm;
  height: 26mm;
  object-fit: contain;
  transform: rotate(-8deg);
}

.qp-stamp-text {
  /*
   * A double border gives the classic two-ring stamp look. We deliberately
   * avoid `box-shadow: inset` here — html2canvas rasterises inset shadows as a
   * solid fill, which would paint over the text and turn the stamp into a
   * filled green block in the exported PDF.
   */
  /*
   * Shrink-wrap the text with symmetric padding + tight line-height so it sits
   * dead-centre in the browser preview (the capture-only nudge is in the
   * `[data-pdf-capture]` block below).
   */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 0.9mm double var(--qp-stamp);
  color: var(--qp-stamp);
  background: #ffffff;
  border-radius: 2mm;
  padding: 2.2mm 4.5mm;
  font-size: 4.5mm;
  font-weight: 800;
  /*
   * No `letter-spacing` here: Arabic is cursive, and spacing the letters apart
   * severs their joining forms — html2canvas then renders the stamp as broken,
   * disconnected glyphs ("تم لاهمﺍد" instead of "تم الاعتماد").
   */
  white-space: nowrap;
  transform: rotate(-8deg);
}

/* ── Capture-only compensation ──────────────────────────── */
/*
 * These rules apply ONLY to the html2canvas capture, never the on-screen
 * preview: `usePdf` tags the cloned root with `data-pdf-capture` (see
 * usePdf.ts). The browser renders Arabic centred, but html2canvas rasterises
 * the glyphs LOW in the line-box (~26 % of row height too low). `transform:
 * translateY()` is ignored by html2canvas, so the only working lever is an
 * asymmetric bottom padding that pushes each glyph back up to the true centre.
 * Values tuned against the real /dev/pdf-demo raster:
 *   thead ≈ 0 %, tbody ≈ 0 %, band ≈ 1 %, stamp ≈ 3 %, title-in-header ≈ 5 %.
 * Em units keep the correction proportional across the different font sizes.
 * RE-TUNE by rendering the actual raster — the CSS preview will look "wrong"
 * here on purpose (that's the whole point of separating the two).
 */
.quran-plan[data-pdf-capture] .qp-cc {
  padding: 0 2.5mm 1.15em;
}

.quran-plan[data-pdf-capture] .qp-completion-label,
.quran-plan[data-pdf-capture] .qp-completion-text {
  padding-block: 0 1.25em;
}

.quran-plan[data-pdf-capture] .qp-stamp-text {
  padding: 1mm 4.5mm 3.4mm;
}

/*
 * Header: the title + student group is drawn low by html2canvas too, but the
 * header is a prominent bordered box whose SIZE must stay identical in the
 * preview and the export. So instead of adding padding (which would grow the
 * box) we REDISTRIBUTE the existing vertical padding — less on top, more on the
 * bottom, same total (1.2 + 4.8 = 6mm = the preview's 3 + 3) — which shifts the
 * group up to centre without changing the header's height (verified 22.5mm in
 * both, title offset 8% → 0%).
 */
.quran-plan[data-pdf-capture] .qp-header {
  padding: 1.2mm 5mm 4.8mm;
}
</style>
