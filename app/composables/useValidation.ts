import * as z from 'zod'

export const EMAIL_PATTERN = /^\S[^\s@]*@\S[^\s.]*\.\S+$/

export const PHONE_PATTERN = /^\+\d{1,3}[\d\s-]{6,18}$/

export const PALESTINIAN_ID_PATTERN = /^\d{9}$/

const ARABIC_INDIC_OFFSET = 0x0660 - 0x30
const PERSIAN_OFFSET = 0x06f0 - 0x30

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
