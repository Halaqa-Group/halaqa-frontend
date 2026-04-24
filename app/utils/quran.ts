/**
 * Quran utilities for verse validation and range formatting
 * Mirrors backend validation logic from halaqa-nestjs/src/common/quran.utils.ts
 */

// Total verse count for each of the 114 surahs (indexed 1-114)
export const VERSE_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
  21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
  31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
  41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
  51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
  61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
  71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
  81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
  91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
  111: 5, 112: 4, 113: 5, 114: 6
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a Quran verse range
 * @returns {ValidationResult} Object with valid flag and optional error message in Arabic
 */
export function isValidVerseRange(
  startSurah: number,
  startVerse: number,
  endSurah: number,
  endVerse: number
): ValidationResult {
  // Validate surah numbers (1-114)
  if (startSurah < 1 || startSurah > 114) {
    return { valid: false, error: 'سورة البداية غير صحيحة (1-114)' }
  }
  if (endSurah < 1 || endSurah > 114) {
    return { valid: false, error: 'سورة النهاية غير صحيحة (1-114)' }
  }

  // Validate verse numbers against surah verse counts
  const startSurahVerseCount = VERSE_COUNTS[startSurah]
  const endSurahVerseCount = VERSE_COUNTS[endSurah]

  if (startVerse < 1 || startVerse > startSurahVerseCount) {
    return { valid: false, error: `آية البداية خارج نطاق السورة (1-${startSurahVerseCount})` }
  }
  if (endVerse < 1 || endVerse > endSurahVerseCount) {
    return { valid: false, error: `آية النهاية خارج نطاق السورة (1-${endSurahVerseCount})` }
  }

  // Ensure end is not before start
  if (endSurah < startSurah) {
    return { valid: false, error: 'سورة النهاية يجب أن تكون بعد سورة البداية' }
  }
  if (endSurah === startSurah && endVerse < startVerse) {
    return { valid: false, error: 'آية النهاية يجب أن تكون بعد آية البداية' }
  }

  return { valid: true }
}

/**
 * Formats a verse range for display
 * @example formatVerseRange(1, 1, 1, 7) => "الفاتحة 1-7"
 * @example formatVerseRange(2, 1, 2, 10) => "البقرة 1-10"
 */
export function formatVerseRange(
  startSurah: number,
  startVerse: number,
  endSurah: number,
  endVerse: number,
  surahNames: Record<number, string>
): string {
  if (startSurah === endSurah) {
    return `${surahNames[startSurah]} ${startVerse}-${endVerse}`
  }
  return `${surahNames[startSurah]}:${startVerse} - ${surahNames[endSurah]}:${endVerse}`
}

/**
 * Calculates total verses in a range (approximation using position encoding)
 */
export function totalVersesInRange(
  startSurah: number,
  startVerse: number,
  endSurah: number,
  endVerse: number
): number {
  const start = startSurah * 10000 + startVerse
  const end = endSurah * 10000 + endVerse
  return Math.max(0, end - start + 1)
}
