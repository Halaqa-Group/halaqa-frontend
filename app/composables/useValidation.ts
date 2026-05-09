import * as z from 'zod'

// Permissive email check (matches existing FormModal patterns).
export const EMAIL_PATTERN = /^\S[^\s@]*@\S[^\s.]*\.\S+$/

// International phone: leading +, country code, total 7-19 digits with optional spaces/dashes.
export const PHONE_PATTERN = /^\+\d{1,3}[\d\s-]{6,18}$/

// Palestinian national ID: exactly 9 digits.
// Bad checksums are surfaced by the backend as warnings, not rejections, so the
// frontend only checks length/shape.
export const PALESTINIAN_ID_PATTERN = /^\d{9}$/

const ARABIC_INDIC_OFFSET = 0x0660 - 0x30 // ٠ → 0
const PERSIAN_OFFSET = 0x06f0 - 0x30 // ۰ → 0

/** Mirrors the backend's PalestinianIdValidator.normalize: strips spaces/dashes
 * and converts Arabic-Indic / Persian digits to ASCII so users can paste IDs in
 * any script. Call this before sending to the API or matching against
 * PALESTINIAN_ID_PATTERN. */
export function normalizeDigits(input: string): string {
  return [...input.trim()]
    .filter(ch => !/\s|-/.test(ch))
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code >= 0x0660 && code <= 0x0669) return String.fromCharCode(code - ARABIC_INDIC_OFFSET)
      if (code >= 0x06f0 && code <= 0x06f9) return String.fromCharCode(code - PERSIAN_OFFSET)
      return ch
    })
    .join('')
}

interface FieldOpts {
  required?: boolean
}

/** Field-level Zod schemas keyed off the i18n catalog. Call these inside a
 * `computed(() => z.object({...}))` so error messages re-resolve when the
 * locale changes. */
export function useValidation() {
  const { t } = useI18n()

  function requiredString() {
    return z.string({ error: () => t('validation.required') })
      .trim()
      .min(1, t('validation.required'))
  }

  function email(opts: FieldOpts = {}) {
    if (opts.required) {
      return z.string({ error: () => t('validation.required') })
        .trim()
        .min(1, t('validation.required'))
        .refine(v => EMAIL_PATTERN.test(v), { message: t('validation.email') })
    }
    return z.string()
      .refine(v => !v || EMAIL_PATTERN.test(v.trim()), { message: t('validation.email') })
  }

  function phone(opts: FieldOpts = {}) {
    if (opts.required) {
      return z.string({ error: () => t('validation.required') })
        .trim()
        .min(1, t('validation.required'))
        .refine(v => PHONE_PATTERN.test(v), { message: t('validation.contact_format') })
    }
    return z.string()
      .refine(v => !v || PHONE_PATTERN.test(v.trim()), { message: t('validation.contact_format') })
  }

  function palestinianId(opts: FieldOpts = {}) {
    if (opts.required) {
      return z.string({ error: () => t('validation.required') })
        .trim()
        .min(1, t('validation.required'))
        .refine(v => PALESTINIAN_ID_PATTERN.test(normalizeDigits(v)), {
          message: t('validation.palestinian_id')
        })
    }
    return z.string()
      .refine(v => !v || PALESTINIAN_ID_PATTERN.test(normalizeDigits(v)), {
        message: t('validation.palestinian_id')
      })
  }

  return {
    requiredString,
    email,
    phone,
    palestinianId
  }
}
