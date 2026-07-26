/**
 * Dial codes for the WhatsApp number picker.
 *
 * Arab countries first — they are the realistic audience and appear at the top
 * of the list without needing a search — then the rest of the common
 * destinations for families abroad. `iso` is only a stable key/flag source; the
 * API stores the `dial` value verbatim alongside the national number.
 */
export interface CountryDialCode {
  iso: string
  dial: string
  nameAr: string
  nameEn: string
}

/** Preselected when no number is stored yet. */
export const DEFAULT_DIAL_CODE = '+970'

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: 'PS', dial: '+970', nameAr: 'فلسطين', nameEn: 'Palestine' },
  { iso: 'JO', dial: '+962', nameAr: 'الأردن', nameEn: 'Jordan' },
  { iso: 'SA', dial: '+966', nameAr: 'السعودية', nameEn: 'Saudi Arabia' },
  { iso: 'AE', dial: '+971', nameAr: 'الإمارات', nameEn: 'United Arab Emirates' },
  { iso: 'EG', dial: '+20', nameAr: 'مصر', nameEn: 'Egypt' },
  { iso: 'QA', dial: '+974', nameAr: 'قطر', nameEn: 'Qatar' },
  { iso: 'KW', dial: '+965', nameAr: 'الكويت', nameEn: 'Kuwait' },
  { iso: 'BH', dial: '+973', nameAr: 'البحرين', nameEn: 'Bahrain' },
  { iso: 'OM', dial: '+968', nameAr: 'عُمان', nameEn: 'Oman' },
  { iso: 'YE', dial: '+967', nameAr: 'اليمن', nameEn: 'Yemen' },
  { iso: 'IQ', dial: '+964', nameAr: 'العراق', nameEn: 'Iraq' },
  { iso: 'SY', dial: '+963', nameAr: 'سوريا', nameEn: 'Syria' },
  { iso: 'LB', dial: '+961', nameAr: 'لبنان', nameEn: 'Lebanon' },
  { iso: 'SD', dial: '+249', nameAr: 'السودان', nameEn: 'Sudan' },
  { iso: 'LY', dial: '+218', nameAr: 'ليبيا', nameEn: 'Libya' },
  { iso: 'TN', dial: '+216', nameAr: 'تونس', nameEn: 'Tunisia' },
  { iso: 'DZ', dial: '+213', nameAr: 'الجزائر', nameEn: 'Algeria' },
  { iso: 'MA', dial: '+212', nameAr: 'المغرب', nameEn: 'Morocco' },
  { iso: 'MR', dial: '+222', nameAr: 'موريتانيا', nameEn: 'Mauritania' },
  { iso: 'SO', dial: '+252', nameAr: 'الصومال', nameEn: 'Somalia' },
  { iso: 'DJ', dial: '+253', nameAr: 'جيبوتي', nameEn: 'Djibouti' },
  { iso: 'KM', dial: '+269', nameAr: 'جزر القمر', nameEn: 'Comoros' },
  { iso: 'TR', dial: '+90', nameAr: 'تركيا', nameEn: 'Türkiye' },
  { iso: 'MY', dial: '+60', nameAr: 'ماليزيا', nameEn: 'Malaysia' },
  { iso: 'ID', dial: '+62', nameAr: 'إندونيسيا', nameEn: 'Indonesia' },
  { iso: 'PK', dial: '+92', nameAr: 'باكستان', nameEn: 'Pakistan' },
  { iso: 'IN', dial: '+91', nameAr: 'الهند', nameEn: 'India' },
  { iso: 'BD', dial: '+880', nameAr: 'بنغلاديش', nameEn: 'Bangladesh' },
  { iso: 'GB', dial: '+44', nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom' },
  // +1 is shared across North America; one entry keeps the dial values unique,
  // which is what the form binds to.
  { iso: 'US', dial: '+1', nameAr: 'الولايات المتحدة / كندا', nameEn: 'United States / Canada' },
  { iso: 'DE', dial: '+49', nameAr: 'ألمانيا', nameEn: 'Germany' },
  { iso: 'FR', dial: '+33', nameAr: 'فرنسا', nameEn: 'France' },
  { iso: 'NL', dial: '+31', nameAr: 'هولندا', nameEn: 'Netherlands' },
  { iso: 'BE', dial: '+32', nameAr: 'بلجيكا', nameEn: 'Belgium' },
  { iso: 'SE', dial: '+46', nameAr: 'السويد', nameEn: 'Sweden' },
  { iso: 'NO', dial: '+47', nameAr: 'النرويج', nameEn: 'Norway' },
  { iso: 'DK', dial: '+45', nameAr: 'الدنمارك', nameEn: 'Denmark' },
  { iso: 'ES', dial: '+34', nameAr: 'إسبانيا', nameEn: 'Spain' },
  { iso: 'IT', dial: '+39', nameAr: 'إيطاليا', nameEn: 'Italy' },
  { iso: 'AU', dial: '+61', nameAr: 'أستراليا', nameEn: 'Australia' },
  { iso: 'ZA', dial: '+27', nameAr: 'جنوب أفريقيا', nameEn: 'South Africa' },
  { iso: 'NG', dial: '+234', nameAr: 'نيجيريا', nameEn: 'Nigeria' },
  { iso: 'KE', dial: '+254', nameAr: 'كينيا', nameEn: 'Kenya' }
]

/**
 * Regional-indicator flag from the ISO code — no icon assets, and it renders in
 * both directions since the emoji carries no text.
 */
export function dialCodeFlag(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}
