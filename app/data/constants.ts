import type { Student, DayData } from '~/types'

// Track types for achievements (mirrors backend TrackType enum)
export const TRACK_TYPES = [
  { value: 'Hifz', label: 'حفظ جديد', colorVar: '--color-track-hifz', bgVar: '--color-track-hifz-bg' },
  { value: 'Near', label: 'مراجعة قريبة', colorVar: '--color-track-near', bgVar: '--color-track-near-bg' },
  { value: 'Far', label: 'مراجعة بعيدة', colorVar: '--color-track-far', bgVar: '--color-track-far-bg' }
] as const

// All 114 Quranic surahs indexed by number
export const SURAH_NAMES: Record<number, string> = {
  1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة',
  6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
  11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر',
  16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
  21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
  26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر',
  36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية',
  46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
  51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن',
  56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
  61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
  66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة',
  76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التكوير', 82: 'الانفطار', 83: 'المطففين', 84: 'الانشقاق', 85: 'البروج',
  86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين',
  96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات',
  101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل',
  106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر',
  111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس'
}

// Flat list for selectors (short juz-based list used in attendance UI)
export const SURAHS = Object.values(SURAH_NAMES)

export const STATUS_CYCLE = [
  'bg-[#A7D2CB]',
  'bg-[#93C6E7]',
  'bg-[#FFD9C0]',
  'bg-[#EFB0C1]',
  'bg-[#86A3B8]'
] as const

export const STATUS_MAP: Record<string, {
  color: string
  iconColor: string
  bgVar: string
  iconVar: string
  label: string
  icon: string
}> = {
  'bg-[#A7D2CB]': { color: 'bg-[#E0F0EE]', iconColor: 'text-[#4A8E85]', bgVar: '--color-status-ok-bg', iconVar: '--color-status-ok', label: 'ممتاز', icon: 'i-lucide-check' },
  'bg-[#93C6E7]': { color: 'bg-[#E3F2FD]', iconColor: 'text-[#2196F3]', bgVar: '--color-status-info-bg', iconVar: '--color-status-info', label: 'جيد جداً', icon: 'i-lucide-user-check' },
  'bg-[#FFD9C0]': { color: 'bg-[#FFF3E0]', iconColor: 'text-[#F57C00]', bgVar: '--color-status-warning-bg', iconVar: '--color-status-warning', label: 'جيد', icon: 'i-lucide-file-text' },
  'bg-[#EFB0C1]': { color: 'bg-[#FCE4EC]', iconColor: 'text-[#D81B60]', bgVar: '--color-status-conflict-bg', iconVar: '--color-status-conflict', label: 'يحتاج مراجعة', icon: 'i-lucide-alert-circle' },
  'bg-[#86A3B8]': { color: 'bg-[#EBEDF0]', iconColor: 'text-[#546E7A]', bgVar: '--color-status-overdue-bg', iconVar: '--color-status-overdue', label: 'قيد الحفظ', icon: 'i-lucide-clock' }
}

export const STUDENTS_LIST = [
  { id: '1', name: 'زيد الفاروق' },
  { id: '2', name: 'عمر الفاروق' },
  { id: '3', name: 'فاطمة الزهراء' }
]

export const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'أميرة رحمن', status: 'active', currentSurah: 'مريم', progress: 92, halaqa: 'شمس الضحى', attendance: 98.5, avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=amira' },
  { id: '2', name: 'زيد الفارسي', status: 'active', currentSurah: 'الكهف', progress: 45, halaqa: 'نسيم الظهيرة', attendance: 92, avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=zaid' },
  { id: '3', name: 'ليلى حسن', status: 'inactive', currentSurah: 'البقرة', progress: 12, halaqa: 'شمس الضحى', attendance: 65, avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=layla' },
  { id: '4', name: 'عمر خالد', status: 'active', currentSurah: 'النبأ', progress: 78, halaqa: 'ندى المساء', attendance: 95, avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=omar' },
  { id: '5', name: 'فاطمة الزهراء', status: 'active', currentSurah: 'الملك', progress: 60, halaqa: 'شمس الضحى', attendance: 88.5, avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=fatima' },
  { id: '6', name: 'حمزة علي', status: 'inactive', currentSurah: 'يوسف', progress: 32, halaqa: 'نسيم الظهيرة', attendance: 72, avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=hamza' }
]

export const INITIAL_SCHEDULE: DayData[] = [
  {
    id: 'day-1', day: 'السبت', date: '٢١ أكتوبر',
    lessons: {
      mem: [{ id: 'l1', startSurah: 'النبأ', startAyah: 1, endSurah: 'النبأ', endAyah: 15 }],
      near: [{ id: 'l2', startSurah: 'النبأ', startAyah: 1, endSurah: 'النبأ', endAyah: 30 }],
      far: [{ id: 'l3', startSurah: 'النبأ', startAyah: 1, endSurah: 'النبأ', endAyah: 50 }]
    },
    statusColors: { mem: 'bg-[#A7D2CB]', near: 'bg-[#93C6E7]', far: 'bg-[#A7D2CB]' }
  },
  {
    id: 'day-2', day: 'الأحد', date: '٢٢ أكتوبر',
    lessons: {
      mem: [{ id: 'l4', startSurah: 'النازعات', startAyah: 16, endSurah: 'النازعات', endAyah: 30 }],
      near: [{ id: 'l5', startSurah: 'النازعات', startAyah: 1, endSurah: 'النازعات', endAyah: 11 }],
      far: [{ id: 'l6', startSurah: 'النبأ', startAyah: 1, endSurah: 'النبأ', endAyah: 20 }]
    },
    statusColors: { mem: 'bg-[#FFD9C0]', near: 'bg-[#A7D2CB]', far: 'bg-[#FFD9C0]' }
  },
  {
    id: 'day-3', day: 'الاثنين', date: '٢٣ أكتوبر',
    lessons: {
      mem: [{ id: 'l7', startSurah: 'النازعات', startAyah: 1, endSurah: 'التكوير', endAyah: 10 }],
      near: [{ id: 'l8', startSurah: 'النازعات', startAyah: 1, endSurah: 'النازعات', endAyah: 24 }],
      far: [{ id: 'l9', startSurah: 'النازعات', startAyah: 1, endSurah: 'النازعات', endAyah: 29 }]
    },
    statusColors: { mem: 'bg-[#A7D2CB]', near: 'bg-[#93C6E7]', far: 'bg-[#EFB0C1]' }
  },
  {
    id: 'day-4', day: 'الثلاثاء', date: '٢٤ أكتوبر',
    lessons: {
      mem: [{ id: 'l10', startSurah: 'عبس', startAyah: 1, endSurah: 'عبس', endAyah: 20 }],
      near: [{ id: 'l11', startSurah: 'النازعات', startAyah: 1, endSurah: 'النازعات', endAyah: 29 }],
      far: [{ id: 'l12', startSurah: 'النازعات', startAyah: 11, endSurah: 'النازعات', endAyah: 45 }]
    },
    statusColors: { mem: 'bg-[#93C6E7]', near: 'bg-[#86A3B8]', far: 'bg-[#93C6E7]' }
  },
  {
    id: 'day-5', day: 'الأربعاء', date: '٢٥ أكتوبر',
    lessons: {
      mem: [{ id: 'l13', startSurah: 'التكوير', startAyah: 1, endSurah: 'التكوير', endAyah: 18 }],
      near: [{ id: 'l14', startSurah: 'عبس', startAyah: 1, endSurah: 'عبس', endAyah: 24 }],
      far: [{ id: 'l15', startSurah: 'النازعات', startAyah: 26, endSurah: 'النازعات', endAyah: 46 }]
    },
    statusColors: { mem: 'bg-[#EFB0C1]', near: 'bg-[#A7D2CB]', far: 'bg-[#86A3B8]' }
  },
  {
    id: 'day-6', day: 'الخميس', date: '٢٦ أكتوبر',
    lessons: {
      mem: [{ id: 'l16', startSurah: 'الانفطار', startAyah: 1, endSurah: 'الانفطار', endAyah: 12 }],
      near: [{ id: 'l17', startSurah: 'التكوير', startAyah: 1, endSurah: 'التكوير', endAyah: 29 }],
      far: [{ id: 'l18', startSurah: 'عبس', startAyah: 1, endSurah: 'عبس', endAyah: 38 }]
    },
    statusColors: { mem: 'bg-[#86A3B8]', near: 'bg-[#93C6E7]', far: 'bg-[#A7D2CB]' }
  },
  {
    id: 'day-7', day: 'الجمعة', date: '٢٧ أكتوبر',
    lessons: {
      mem: [],
      near: [{ id: 'l19', startSurah: 'الانفطار', startAyah: 1, endSurah: 'الانفطار', endAyah: 19 }],
      far: [{ id: 'l20', startSurah: 'التكوير', startAyah: 1, endSurah: 'الانفطار', endAyah: 8 }]
    },
    statusColors: { mem: 'bg-[#86A3B8]', near: 'bg-[#FFD9C0]', far: 'bg-[#A7D2CB]' }
  }
]
