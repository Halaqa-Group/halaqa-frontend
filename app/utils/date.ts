// Local-calendar date helpers. The API speaks plain `YYYY-MM-DD` (no timezone),
// so every conversion goes through the browser's local calendar — never
// `toISOString()`, which shifts the day for anyone east/west of UTC.

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayYmd(): string {
  return toYmd(new Date())
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

// ── Display formatting ──────────────────────────────────────────────────────

/**
 * Maps the UI locale (a bare `ar`/`en`) to the tag used for formatting. `ar-EG`
 * is the Arabic tag whose month names (يناير…) match what the app shows; a bare
 * `ar` or an `ar-SA` can resolve to different month names, and on older CLDR
 * data `ar-SA` resolves to the Hijri calendar outright.
 */
export function dateLocaleTag(locale: string): string {
  return locale === 'ar' ? 'ar-EG' : locale
}

/**
 * `ar` renders dates with U+200F marks embedded between the fields, which
 * reorder the parts inside an LTR container. Strip them so a date reads the
 * same way the API sent it.
 */
function stripBidi(s: string): string {
  return s.replace(/[\u200E\u200F\u061C]/g, '')
}

/** Shared core: Latin digits and the Gregorian calendar, always. */
function formatWith(d: Date, locale: string, options: Intl.DateTimeFormatOptions): string | null {
  if (Number.isNaN(d.getTime())) return null
  try {
    return stripBidi(
      new Intl.DateTimeFormat(dateLocaleTag(locale), {
        ...options,
        numberingSystem: 'latn',
        calendar: 'gregory'
      }).format(d)
    )
  } catch {
    return null
  }
}

const MEDIUM: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
const MEDIUM_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/** Formats a `Date` that is already on the local calendar. */
export function formatDateObj(
  d: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = MEDIUM,
  fallback = '—'
): string {
  return formatWith(d, locale, options) ?? fallback
}

/**
 * Formats an API date-only value (`YYYY-MM-DD`, from a `date` column).
 * `new Date('2023-09-01')` would parse it as UTC midnight, so anyone west of
 * UTC sees the previous day; `parseYmd` reads it on the local calendar instead.
 */
export function formatYmd(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = MEDIUM,
  fallback = '—'
): string {
  if (!value) return fallback
  return formatWith(parseYmd(String(value).slice(0, 10)), locale, options) ?? fallback
}

/**
 * Formats a real instant (a `datetime` column, or an epoch millisecond count).
 * Unlike {@link formatYmd} the UTC parse is correct here — the value carries a
 * time — so only the calendar and the bidi marks need pinning.
 */
export function formatTimestamp(
  value: string | number | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = MEDIUM_TIME,
  fallback = '—'
): string {
  if (value === null || value === undefined || value === '') return fallback
  return formatWith(new Date(value), locale, options) ?? fallback
}
