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

/**
 * Both export formats produced from a single capture, ready to hand to
 * {@link UsePdf.saveBlob} / {@link UsePdf.shareBlob} the instant a button is
 * clicked. See {@link UsePdf.renderExports} for why they are rendered ahead of
 * time rather than on click.
 */
export interface PreparedExports {
  /** The capture as a PNG image (`image/png`). */
  png: Blob
  /** The capture placed on a paper-sized page (`application/pdf`). */
  pdf: Blob
}

/** Share-sheet metadata for {@link UsePdf.shareBlob}. */
export interface ShareBlobOptions {
  /** File name, extension included — what the receiving app sees. */
  fileName: string
  /** Title passed to the share sheet. */
  title?: string
  /** Message body passed to the share sheet — becomes the WhatsApp caption. */
  text?: string
}

export interface UsePdf {
  /**
   * Render both export formats from ONE off-screen capture, without touching
   * the filesystem or the share sheet.
   *
   * Call this ahead of the user's click (e.g. when a print dialog opens) and
   * keep the result: Safari — desktop *and* iOS — only permits a download or
   * `navigator.share()` while the page holds a **transient user activation**,
   * which a multi-second html2canvas capture destroys. Rendering up-front keeps
   * the click handler synchronous, so the activation is still valid.
   */
  renderExports: (elementId: string, options?: ExportPdfOptions) => Promise<PreparedExports>
  /**
   * Save a blob as `fileName`. Synchronous on purpose — call it directly from a
   * click handler, before any `await`, or Safari will silently drop the download.
   */
  saveBlob: (blob: Blob, fileName: string) => void
  /** Whether this browser can share `blob` as a file. Synchronous, so a click handler can branch without awaiting. */
  canShareBlob: (blob: Blob, fileName: string) => boolean
  /**
   * Offer a blob to the native share sheet as a file (WhatsApp, Telegram, …).
   * Call it as the first statement of a click handler — see {@link renderExports}.
   */
  shareBlob: (blob: Blob, options: ShareBlobOptions) => Promise<ShareResult>
  /**
   * Capture + download a PDF in one go. Convenient, but the download fires after
   * the capture, so **Safari blocks it** — prefer {@link renderExports} +
   * {@link saveBlob} anywhere iOS/macOS users are expected.
   */
  exportPdf: (elementId: string, options?: ExportPdfOptions) => Promise<void>
  /** Capture + download a PNG. Same Safari caveat as {@link exportPdf}. */
  exportPng: (elementId: string, options?: ExportPngOptions) => Promise<void>
  /**
   * Capture the element as a PNG and offer it to the native share sheet as a
   * file. Same Safari caveat as {@link exportPdf} — WebKit rejects a `share()`
   * that follows the capture with `NotAllowedError`.
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

/**
 * Hard stop for a single capture. html2canvas has no internal timeout: on WebKit
 * it awaits every image in the *whole cloned document* before rendering, so one
 * request that never settles hangs the promise forever — which reaches the user
 * as a button that does nothing at all. Failing loudly is far easier to debug.
 */
const CAPTURE_TIMEOUT_MS = 30_000

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
  /**
   * Make every text range report a single client rect, so html2canvas draws each
   * word with one `fillText` call.
   *
   * html2canvas measures a word with `Range.getClientRects()`; when that returns
   * MORE than one rect it gives up on the word and redraws it grapheme by
   * grapheme (`parseTextBounds` in the library). Latin survives that, but Arabic
   * is cursive: drawing letters individually severs their joining forms and
   * stacks them at wrong advances — "الحفظ" comes out as "لحفظ" with the alef
   * sitting on top of the lam.
   *
   * Blink returns one rect per word, so Android/Chrome never hit the path.
   * WebKit splits a range into several rects far more readily (per text/bidi run
   * — Arabic next to Latin digits is enough), which is why the exact same export
   * was mangled on iPhone and macOS Safari only.
   *
   * Rects that all sit on one line are just fragments of one box, so collapsing
   * them to the range's bounding rect loses nothing. A genuinely wrapped range
   * (rects on different lines) is left untouched — there the per-grapheme path is
   * the lesser evil.
   *
   * Patched on the CLONED iframe's `Range` — a throwaway realm html2canvas
   * discards after the capture — so the live page's DOM APIs are never touched.
   */
  function coalesceTextRangeRects(clonedDoc: Document): void {
    const view = clonedDoc.defaultView
    if (!view?.Range) return

    const original = view.Range.prototype.getClientRects
    view.Range.prototype.getClientRects = function (this: Range): DOMRectList {
      const rects = original.call(this)
      if (rects.length < 2) return rects

      const first = rects[0]
      if (!first) return rects
      for (let i = 1; i < rects.length; i++) {
        // Sub-pixel jitter is normal within a line; a real wrap is a whole line apart.
        if (Math.abs((rects[i]?.top ?? 0) - first.top) > 1) return rects
      }
      // Array, not a DOMRectList — the library reads it via `Array.from`.
      return [this.getBoundingClientRect()] as unknown as DOMRectList
    }
  }

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

      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`usePdf: capture timed out after ${CAPTURE_TIMEOUT_MS} ms`)),
          CAPTURE_TIMEOUT_MS
        )
      })

      const rendering = html2canvas(clone, {
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
          // Keeps Arabic joined on WebKit — see coalesceTextRangeRects.
          coalesceTextRangeRects(clonedDoc)
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

      const canvas = await Promise.race([rendering, timeout]).finally(() => clearTimeout(timer))

      return { canvas, widthPx, heightPx }
    } finally {
      stage.remove()
    }
  }

  /** Decode a `data:` URL into a Blob without a network round-trip (CSP-safe). */
  function dataUrlToBlob(dataUrl: string): Blob {
    const [header = '', base64 = ''] = dataUrl.split(',')
    const mime = /:(.*?);/.exec(header)?.[1] ?? 'image/png'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }

  /** Canvas → PNG blob, falling back to the data URL when `toBlob` yields null (large canvases on iOS). */
  async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    return blob ?? dataUrlToBlob(canvas.toDataURL('image/png'))
  }

  /** Place a capture on a paper-sized jsPDF page and return it as a blob. */
  function canvasToPdfBlob(
    canvas: HTMLCanvasElement,
    layout: {
      widthPx: number
      format: string | [number, number]
      orientation: 'portrait' | 'landscape'
      margin: number
      verticalAlign: 'top' | 'center'
    }
  ): Blob {
    const { widthPx, format, orientation, margin, verticalAlign } = layout

    const pdf = new jsPDF({ orientation, unit: 'mm', format, compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Fit the capture to the printable width, preserving aspect ratio. The
    // millimetre size comes from the off-screen clone's natural box, so a phone
    // export lands on paper at exactly the desktop size.
    const usableWidth = pageWidth - margin * 2
    const naturalWidthMm = widthPx * PX_TO_MM
    const renderWidth = Math.min(usableWidth, naturalWidthMm)
    const renderHeight = (canvas.height / canvas.width) * renderWidth

    const x = margin + (usableWidth - renderWidth) / 2
    const y = verticalAlign === 'center'
      ? Math.max(margin, (pageHeight - renderHeight) / 2)
      : margin

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST')

    // `output('blob')` instead of `save()`: jsPDF's bundled saveAs clicks an
    // anchor that is never inserted into the document, from inside a
    // `setTimeout(…, 0)`. WebKit ignores such a download — silently. We hand the
    // blob to `saveBlob` from the click handler instead.
    return pdf.output('blob')
  }

  /**
   * Trigger a file download. Deliberately synchronous: Safari (macOS and iOS)
   * only performs a programmatic download while the page holds a transient user
   * activation, and any `await` before this call gives that away. The anchor is
   * also inserted into the document — WebKit ignores clicks on detached nodes.
   */
  function saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Revoked late: iOS starts reading the blob after the handler returns.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  /**
   * The share-capable slice of `navigator`, or null. `lib.dom` declares
   * `share`/`canShare` as always present, but they are genuinely missing on
   * desktop browsers and on any non-secure origin — hence the `typeof` probes.
   */
  function shareApi(): (Navigator & { canShare?: (data?: ShareData) => boolean }) | null {
    if (!import.meta.client) return null
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean }
    return typeof nav.share === 'function' && typeof nav.canShare === 'function' ? nav : null
  }

  function canShareBlob(blob: Blob, fileName: string): boolean {
    const nav = shareApi()
    if (!nav) {
      // A non-secure origin (plain http://…, e.g. a phone hitting the dev server
      // over the LAN) hides the whole Web Share API. Worth saying out loud —
      // otherwise "share does nothing" looks like an app bug.
      if (import.meta.client && !window.isSecureContext) {
        console.warn('usePdf: Web Share is unavailable because the page is not a secure context (https/localhost).')
      }
      return false
    }
    return nav.canShare?.({ files: [new File([blob], fileName, { type: blob.type || 'image/png' })] }) ?? false
  }

  async function shareBlob(blob: Blob, options: ShareBlobOptions): Promise<ShareResult> {
    const { fileName, title, text } = options
    const nav = shareApi()
    if (!nav) return 'unsupported'

    const file = new File([blob], fileName, { type: blob.type || 'image/png' })
    if (!nav.canShare?.({ files: [file] })) return 'unsupported'

    // Some WebKit builds reject a payload that mixes files with title/text, so
    // fall back to sharing the file alone rather than failing outright.
    const full: ShareData = { files: [file], title, text }
    const payload = nav.canShare?.(full) ? full : { files: [file] }

    try {
      await nav.share(payload)
      return 'shared'
    } catch (err) {
      // The user dismissing the share sheet rejects with AbortError — that's a
      // normal outcome, not a failure the caller should report.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      throw err
    }
  }

  async function renderExports(
    elementId: string,
    options: ExportPdfOptions = {}
  ): Promise<PreparedExports> {
    const {
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
      const { canvas, widthPx } = await capture(elementId, { scale, background, wordSpacing })
      return {
        png: await canvasToPngBlob(canvas),
        pdf: canvasToPdfBlob(canvas, { widthPx, format, orientation, margin, verticalAlign })
      }
    } finally {
      isExporting.value = false
    }
  }

  async function exportPdf(elementId: string, options: ExportPdfOptions = {}): Promise<void> {
    if (!import.meta.client) return
    const { fileName = 'document' } = options
    const { pdf } = await renderExports(elementId, options)
    saveBlob(pdf, `${fileName}.pdf`)
  }

  async function exportPng(elementId: string, options: ExportPngOptions = {}): Promise<void> {
    if (!import.meta.client) return
    const { fileName = 'image' } = options
    const { png } = await renderExports(elementId, options)
    saveBlob(png, `${fileName}.png`)
  }

  async function sharePng(elementId: string, options: SharePngOptions = {}): Promise<ShareResult> {
    if (!import.meta.client) return 'unsupported'

    const { fileName = 'image', title, text } = options

    // Bail out before the expensive capture on browsers with no file sharing
    // (most desktops). A probe File keeps the `canShare` check honest.
    if (!canShareBlob(new Blob([''], { type: 'image/png' }), `${fileName}.png`)) return 'unsupported'

    const { png } = await renderExports(elementId, options)
    return shareBlob(png, { fileName: `${fileName}.png`, title, text })
  }

  return {
    renderExports,
    saveBlob,
    canShareBlob,
    shareBlob,
    exportPdf,
    exportPng,
    sharePng,
    isExporting
  }
}
