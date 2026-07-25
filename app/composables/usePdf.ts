import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

/**
 * Options for a single PDF export.
 *
 * The defaults are tuned for the printable templates in `components/pdf/*`:
 * A4 portrait, high-DPI raster, WYSIWYG placement at the top of the page.
 */
export interface ExportPdfOptions {
  /** Downloaded file name (without extension). Defaults to `document`. */
  fileName?: string
  /** Paper format passed to jsPDF. Defaults to `a4`. */
  format?: string | [number, number]
  /** Page orientation. Defaults to `portrait`. */
  orientation?: 'portrait' | 'landscape'
  /**
   * html2canvas raster multiplier. Higher = sharper, heavier file.
   * Defaults to 3 for crisp Arabic glyphs.
   */
  scale?: number
  /** Outer page margin in millimetres. Defaults to 0 (the template owns its own padding). */
  margin?: number
  /**
   * Vertical placement of the captured block on the page.
   * `top` (default) matches the "upper half A5" printing requirement.
   */
  verticalAlign?: 'top' | 'center'
  /** Background used behind transparent regions. Defaults to `#ffffff`. */
  background?: string
  /**
   * CSS `word-spacing` applied to the captured clone only (not the live DOM).
   * html2canvas measures the space advance of some Arabic webfonts as ~0 and
   * collapses the gaps between words ("خطةالحافظ"); a small explicit value
   * (e.g. `0.18em`) restores them without widening the on-screen preview.
   */
  wordSpacing?: string
}

/**
 * Options for a single PNG export. A subset of {@link ExportPdfOptions} — the
 * paper-layout fields (format/orientation/margin/verticalAlign) don't apply to
 * a raw raster, which is saved at its natural capture resolution.
 */
export interface ExportPngOptions {
  /** Downloaded file name (without extension). Defaults to `image`. */
  fileName?: string
  /** html2canvas raster multiplier. Higher = sharper, heavier file. Defaults to 3. */
  scale?: number
  /** Background used behind transparent regions. Defaults to `#ffffff`. */
  background?: string
  /** CSS `word-spacing` applied to the captured clone only. See {@link ExportPdfOptions.wordSpacing}. */
  wordSpacing?: string
}

export interface UsePdf {
  /** Export the element carrying the given `id` to a downloaded PDF. */
  exportPdf: (elementId: string, options?: ExportPdfOptions) => Promise<void>
  /** Export the element carrying the given `id` to a downloaded PNG image. */
  exportPng: (elementId: string, options?: ExportPngOptions) => Promise<void>
  /** True while a capture/render is in flight — bind to a button's `:loading`. */
  isExporting: Ref<boolean>
}

const MM_PER_INCH = 25.4
const CSS_DPI = 96
/** CSS pixels → millimetres, so we can map an on-screen box onto paper 1:1. */
const PX_TO_MM = MM_PER_INCH / CSS_DPI

/**
 * Generic, template-agnostic PDF exporter built on html2canvas-pro + jsPDF.
 *
 * It captures any DOM subtree by `id` and drops the resulting raster onto a
 * paper-sized jsPDF page at its natural millimetre dimensions, so the download
 * matches the browser preview pixel-for-pixel (WYSIWYG). Because it only needs
 * an element id, the same composable backs every printable template —
 * certificates, attendance sheets, reports, exam schedules, permission forms —
 * not just the memorization plan.
 *
 * @example
 * const { exportPdf, isExporting } = usePdf()
 * await exportPdf('quran-plan', { fileName: 'plan-ahmad' })
 */
export function usePdf(): UsePdf {
  const isExporting = ref(false)

  /**
   * Rasterise the element carrying `elementId` to a canvas at full layout size.
   * Shared by {@link exportPdf} and {@link exportPng} — assumes the caller has
   * already awaited `document.fonts.ready` and flipped `isExporting`.
   */
  async function capture(
    elementId: string,
    opts: { scale: number, background: string, wordSpacing?: string }
  ): Promise<HTMLCanvasElement> {
    const { scale, background, wordSpacing } = opts

    const el = document.getElementById(elementId)
    if (!el) {
      throw new Error(`usePdf: no element found with id "${elementId}"`)
    }

    // Rasterise the element at its real layout size. html2canvas measures the
    // node's own box, so any responsive `transform: scale()` on an *ancestor*
    // preview wrapper is ignored — we always capture at full resolution.
    return html2canvas(el, {
      scale,
      backgroundColor: background,
      useCORS: true,
      logging: false,
      // Ensure fonts/colours resolve from the live document, not a stale clone.
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      // Patch the cloned document only — leaves the live preview untouched.
      onclone: (clonedDoc: Document) => {
        if (!wordSpacing) return
        const style = clonedDoc.createElement('style')
        style.textContent
          = `#${elementId}, #${elementId} * { word-spacing: ${wordSpacing} !important; }`
        clonedDoc.head.appendChild(style)
      }
    })
  }

  async function exportPdf(elementId: string, options: ExportPdfOptions = {}): Promise<void> {
    if (!import.meta.client) return

    const {
      fileName = 'document',
      format = 'a4',
      orientation = 'portrait',
      scale = 3,
      margin = 0,
      verticalAlign = 'top',
      background = '#ffffff',
      wordSpacing
    } = options

    const el = document.getElementById(elementId)
    if (!el) {
      throw new Error(`usePdf: no element found with id "${elementId}"`)
    }

    // Web fonts must be fully loaded before capture, otherwise html2canvas
    // rasterises a fallback face with different metrics.
    if (document.fonts?.ready) await document.fonts.ready

    isExporting.value = true
    try {
      const canvas = await capture(elementId, { scale, background, wordSpacing })

      const pdf = new jsPDF({ orientation, unit: 'mm', format, compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Fit the capture to the printable width, preserving aspect ratio.
      const usableWidth = pageWidth - margin * 2
      const naturalWidthMm = el.offsetWidth * PX_TO_MM
      const naturalHeightMm = el.offsetHeight * PX_TO_MM
      const renderWidth = Math.min(usableWidth, naturalWidthMm)
      const renderHeight = (canvas.height / canvas.width) * renderWidth

      const x = margin + (usableWidth - renderWidth) / 2
      const y = verticalAlign === 'center'
        ? Math.max(margin, (pageHeight - renderHeight) / 2)
        : margin

      const image = canvas.toDataURL('image/png')
      pdf.addImage(image, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST')
      pdf.save(`${fileName}.pdf`)

      // naturalHeightMm is exposed for callers that want to validate the block
      // truly fits the requested paper region; unused here but cheap to compute.
      void naturalHeightMm
    } finally {
      isExporting.value = false
    }
  }

  async function exportPng(elementId: string, options: ExportPngOptions = {}): Promise<void> {
    if (!import.meta.client) return

    const {
      fileName = 'image',
      scale = 3,
      background = '#ffffff',
      wordSpacing
    } = options

    // Web fonts must be fully loaded before capture, otherwise html2canvas
    // rasterises a fallback face with different metrics.
    if (document.fonts?.ready) await document.fonts.ready

    isExporting.value = true
    try {
      const canvas = await capture(elementId, { scale, background, wordSpacing })

      const link = document.createElement('a')
      link.download = `${fileName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      isExporting.value = false
    }
  }

  return { exportPdf, exportPng, isExporting }
}
