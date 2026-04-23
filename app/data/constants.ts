import type { Student, DayData } from '~/types'

export const SURAHS = [
  'النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار',
  'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى',
  'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل'
]

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
  bgHex: string
  iconHex: string
  label: string
  icon: string
}> = {
  'bg-[#A7D2CB]': { color: 'bg-[#E0F0EE]', iconColor: 'text-[#4A8E85]', bgHex: '#E0F0EE', iconHex: '#4A8E85', label: 'ممتاز', icon: 'i-lucide-check' },
  'bg-[#93C6E7]': { color: 'bg-[#E3F2FD]', iconColor: 'text-[#2196F3]', bgHex: '#E3F2FD', iconHex: '#2196F3', label: 'جيد جداً', icon: 'i-lucide-user-check' },
  'bg-[#FFD9C0]': { color: 'bg-[#FFF3E0]', iconColor: 'text-[#F57C00]', bgHex: '#FFF3E0', iconHex: '#F57C00', label: 'جيد', icon: 'i-lucide-file-text' },
  'bg-[#EFB0C1]': { color: 'bg-[#FCE4EC]', iconColor: 'text-[#D81B60]', bgHex: '#FCE4EC', iconHex: '#D81B60', label: 'يحتاج مراجعة', icon: 'i-lucide-alert-circle' },
  'bg-[#86A3B8]': { color: 'bg-[#EBEDF0]', iconColor: 'text-[#546E7A]', bgHex: '#EBEDF0', iconHex: '#546E7A', label: 'قيد الحفظ', icon: 'i-lucide-clock' }
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
