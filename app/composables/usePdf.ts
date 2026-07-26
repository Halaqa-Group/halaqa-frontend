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

/**
 * Options for sharing a PNG capture through the native share sheet
 * ({@link https://developer.mozilla.org/docs/Web/API/Navigator/share Web Share API}).
 * Extends {@link ExportPngOptions} with the share-sheet metadata.
 */
export interface SharePngOptions extends ExportPngOptions {
  /** Title passed to the share sheet. */
  title?: string
  /** Message body passed to the share sheet — becomes the WhatsApp caption. */
  text?: string
}

/**
 * Outcome of {@link UsePdf.sharePng}:
 * - `shared` — handed to the OS share sheet successfully.
 * - `cancelled` — the user dismissed the sheet (not an error).
 * - `unsupported` — this browser can't share files (e.g. most desktops); the
 *   caller should fall back to a plain download.
 */
export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

export interface UsePdf {
  /** Export the element carrying the given `id` to a downloaded PDF. */
  exportPdf: (elementId: string, options?: ExportPdfOptions) => Promise<void>
  /** Export the element carrying the given `id` to a downloaded PNG image. */
  exportPng: (elementId: string, options?: ExportPngOptions) => Promise<void>
  /**
   * Capture the element as a PNG and offer it to the native share sheet as a
   * file (WhatsApp, Telegram, …). Only sends the image on browsers that support
   * sharing files — returns `unsupported` otherwise so the caller can fall back.
   */
  sharePng: (elementId: string, options?: SharePngOptions) => Promise<ShareResult>
  /** True while a capture/render is in flight — bind to a button's `:loading`. */
  isExporting: Ref<boolean>
}

const MM_PER_INCH = 25.4
const CSS_DPI = 96
/** CSS pixels → millimetres, so we can map an on-screen box onto paper 1:1. */
const PX_TO_MM = MM_PER_INCH / CSS_DPI

/**
 * Upper bound on the rasterised canvas area (width × height, in device pixels).
 * Mobile Safari refuses to allocate a 2D canvas beyond ~16.7 M pixels and hands
 * back a blank/black bitmap instead of throwing, which used to surface as an
 * empty PDF on phones. We lower `scale` instead of failing — the export keeps
 * its full millimetre size, only the DPI drops, and only for very tall plans.
 */
const MAX_CANVAS_PIXELS = 16_777_216

/** A capture rasterised off-screen, plus the natural (unscaled) CSS box it came from. */
interface CaptureResult {
  canvas: HTMLCanvasElement
  /** Natural layout width in CSS px — never affected by any preview `transform: scale()`. */
  widthPx: number
  /** Natural layout height in CSS px. */
  heightPx: number
}

/**
 * Generic, template-agnostic PDF exporter built on html2canvas-pro + jsPDF.
 *
 * It captures any DOM subtree by `id` — off-screen at its natural, unscaled size
 * (see {@link capture}) — and drops the resulting raster onto a paper-sized jsPDF
 * page at its natural millimetre dimensions, so the download matches the browser
 * preview (WYSIWYG) and is identical on desktop and mobile. Because it only needs
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
   * Shared by {@link exportPdf}, {@link exportPng} and {@link sharePng} — assumes
   * the caller has already awaited `document.fonts.ready` and flipped
   * `isExporting`.
   *
   * The live node is **never** captured in place. Instead we deep-clone it onto
   * an off-screen stage and rasterise that, so the output is byte-identical on a
   * phone and on a desktop:
   *
   * - html2canvas derives its capture box from `getBoundingClientRect()` of the
   *   node *inside its cloned document*, which still carries every ancestor
   *   `transform: scale()`. A preview shrunk to fit a 360 px phone therefore
   *   produced a ~0.4× raster — a PDF/PNG a fraction of the desktop size.
   * - Ancestor `overflow: hidden` (the preview shell) and modal/`position: fixed`
   *   containers also skew or clip the capture on small viewports.
   *
   * Detached from all of that, the clone lays out at its own intrinsic size
   * (e.g. a 210 mm A5 block — CSS mm is viewport-independent), so a phone export
   * matches a desktop print exactly.
   */
  async function capture(
    elementId: string,
    opts: { scale: number, background: string, wordSpacing?: string }
  ): Promise<CaptureResult> {
    const { scale, background, wordSpacing } = opts

    const source = document.getElementById(elementId)
    if (!source) {
      throw new Error(`usePdf: no element found with id "${elementId}"`)
    }

    // Distinct id for the off-screen copy: the original stays in the DOM, and
    // html2canvas/`onclone` must be able to target exactly one of the two.
    const captureId = `${elementId}--pdf-capture`

    const stage = document.createElement('div')
    // Parked outside the viewport (a plain offset, not a transform — a transform
    // would land back in the capture bounds). Fixed positioning keeps the clone
    // out of the document flow so the live page never reflows or flashes.
    stage.style.cssText = 'position:fixed;top:0;left:-20000px;width:max-content;'
      + 'margin:0;padding:0;pointer-events:none;'
    stage.setAttribute('aria-hidden', 'true')

    const clone = source.cloneNode(true) as HTMLElement
    clone.id = captureId
    // Neutralise any scaling/positioning the preview put on the node itself.
    clone.style.transform = 'none'
    clone.style.margin = '0'
    stage.appendChild(clone)
    document.body.appendChild(stage)

    try {
      // Natural, transform-free layout box — the size a desktop print uses.
      const widthPx = clone.offsetWidth
      const heightPx = clone.offsetHeight

      // Keep the bitmap inside the mobile canvas budget (see MAX_CANVAS_PIXELS).
      const area = widthPx * heightPx
      const maxScale = area > 0 ? Math.sqrt(MAX_CANVAS_PIXELS / area) : scale
      const safeScale = Math.max(1, Math.min(scale, maxScale))

      const canvas = await html2canvas(clone, {
        scale: safeScale,
        backgroundColor: background,
        useCORS: true,
        logging: false,
        // Size the internal clone-iframe to the element itself, so media queries
        // resolve against the plan's own width rather than the phone viewport.
        windowWidth: Math.max(widthPx, clone.scrollWidth),
        windowHeight: Math.max(heightPx, clone.scrollHeight),
        // The stage is viewport-fixed, so pin the capture origin to 0,0 — otherwise
        // a scrolled page (common on mobile) offsets the crop box.
        scrollX: 0,
        scrollY: 0,
        // Patch the cloned document only — leaves the live preview untouched.
        onclone: (clonedDoc: Document) => {
          const cloned = clonedDoc.getElementById(captureId)
          // Tag the captured clone so templates can apply capture-only styles
          // under `[data-pdf-capture]`. html2canvas rasterises text differently
          // from the browser (e.g. it draws Arabic glyphs low in the line-box),
          // so a template may need small tweaks that must NOT touch the on-screen
          // preview — gate those on this attribute. See QuranPlan.vue.
          cloned?.setAttribute('data-pdf-capture', '')
          if (!wordSpacing) return
          const style = clonedDoc.createElement('style')
          style.textContent
            = `#${captureId}, #${captureId} * { word-spacing: ${wordSpacing} !important; }`
          clonedDoc.head.appendChild(style)
        }
      })

      return { canvas, widthPx, heightPx }
    } finally {
      stage.remove()
    }
  }

  /** Save a canvas as a PNG file. Uses a Blob URL — mobile Safari chokes on huge data URLs. */
  async function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    const href = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')

    const link = document.createElement('a')
    link.download = `${fileName}.png`
    link.href = href
    link.rel = 'noopener'
    // Safari only honours a click on a node that is actually in the document.
    document.body.appendChild(link)
    link.click()
    link.remove()

    if (blob) setTimeout(() => URL.revokeObjectURL(href), 60_000)
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

    // Web fonts must be fully loaded before capture, otherwise html2canvas
    // rasterises a fallback face with different metrics.
    if (document.fonts?.ready) await document.fonts.ready

    isExporting.value = true
    try {
      const { canvas, widthPx, heightPx } = await capture(elementId, { scale, background, wordSpacing })

      const pdf = new jsPDF({ orientation, unit: 'mm', format, compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Fit the capture to the printable width, preserving aspect ratio. The
      // millimetre size comes from the off-screen clone's natural box, so a phone
      // export lands on paper at exactly the desktop size.
      const usableWidth = pageWidth - margin * 2
      const naturalWidthMm = widthPx * PX_TO_MM
      const naturalHeightMm = heightPx * PX_TO_MM
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
      const { canvas } = await capture(elementId, { scale, background, wordSpacing })
      await downloadCanvas(canvas, fileName)
    } finally {
      isExporting.value = false
    }
  }

  async function sharePng(elementId: string, options: SharePngOptions = {}): Promise<ShareResult> {
    if (!import.meta.client) return 'unsupported'

    const {
      fileName = 'image',
      scale = 3,
      background = '#ffffff',
      wordSpacing,
      title,
      text
    } = options

    // Bail out before the expensive capture on browsers with no file sharing
    // (most desktops). A probe File keeps the `canShare` check honest.
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean }
    const probe = new File([''], `${fileName}.png`, { type: 'image/png' })
    if (!nav.share || !nav.canShare?.({ files: [probe] })) return 'unsupported'

    if (document.fonts?.ready) await document.fonts.ready

    isExporting.value = true
    try {
      const { canvas } = await capture(elementId, { scale, background, wordSpacing })
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('usePdf: canvas.toBlob returned null')

      const file = new File([blob], `${fileName}.png`, { type: 'image/png' })
      if (!nav.canShare?.({ files: [file] })) return 'unsupported'

      try {
        await nav.share({ files: [file], title, text })
        return 'shared'
      } catch (err) {
        // The user dismissing the share sheet rejects with AbortError — that's a
        // normal outcome, not a failure the caller should report.
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
        throw err
      }
    } finally {
      isExporting.value = false
    }
  }

  return { exportPdf, exportPng, sharePng, isExporting }
}
