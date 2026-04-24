import { ref, computed } from 'vue'
import { STATUS_CYCLE } from '~/data/constants'
import type { DayData, LessonItem, LessonCategory } from '~/types'

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const ARABIC_DAYS = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة']

export type PlanStatus = 'new' | 'draft' | 'approved'

function toAr(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
}

function lastSaturday(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - ((r.getDay() + 1) % 7))
  return r
}

function emptySchedule(): DayData[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `day-${i + 1}`,
    day: '',
    date: '',
    lessons: { mem: [], near: [], far: [] },
    statusColors: { mem: 'bg-[#86A3B8]', near: 'bg-[#86A3B8]', far: 'bg-[#86A3B8]' }
  }))
}

// Module-level shared state
const schedule = ref<DayData[]>(emptySchedule())
const selectedRowIds = ref<Set<string>>(new Set())
const clipboard = ref<DayData[]>([])
const isEditMode = ref(true)          // new plan starts editable
const planStatus = ref<PlanStatus>('new')
const selectedStudent = ref<string>('')
const selectedWeekStart = ref<Date>(lastSaturday(new Date()))

export function useSchedule() {
  const selectedCount = computed(() => selectedRowIds.value.size)
  const hasSelection = computed(() => selectedRowIds.value.size > 0)
  const allSelected = computed(() =>
    schedule.value.length > 0 && selectedRowIds.value.size === schedule.value.length
  )

  const scheduleWithDates = computed(() =>
    schedule.value.map((item, i) => {
      const d = new Date(selectedWeekStart.value)
      d.setDate(d.getDate() + i)
      return {
        ...item,
        day: ARABIC_DAYS[i] ?? item.day,
        date: `${toAr(d.getDate())} ${ARABIC_MONTHS[d.getMonth()]}`
      }
    })
  )

  // Week change resets the plan to a fresh empty state
  function changeWeek(newStart: Date) {
    selectedWeekStart.value = new Date(newStart)
    schedule.value = emptySchedule()
    planStatus.value = 'new'
    isEditMode.value = true
    selectedRowIds.value = new Set()
    clipboard.value = []
  }

  function saveAsDraft() {
    if (planStatus.value !== 'approved') planStatus.value = 'draft'
    isEditMode.value = false
  }

  function approvePlan() {
    planStatus.value = 'approved'
    isEditMode.value = false
  }

  function startEditing() {
    isEditMode.value = true
  }

  function cancelEditing() {
    isEditMode.value = false
  }

  function toggleSelectRow(id: string) {
    const next = new Set(selectedRowIds.value)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedRowIds.value = next
  }

  function toggleSelectAll() {
    if (allSelected.value) selectedRowIds.value = new Set()
    else selectedRowIds.value = new Set(schedule.value.map(d => d.id))
  }

  function updateDay(id: string, updates: Partial<DayData>) {
    const idx = schedule.value.findIndex(d => d.id === id)
    if (idx !== -1) schedule.value[idx] = { ...schedule.value[idx], ...updates }
  }

  function cycleStatus(dayId: string, category: LessonCategory) {
    const day = schedule.value.find(d => d.id === dayId)
    if (!day) return
    const current = day.statusColors[category]
    const idx = STATUS_CYCLE.indexOf(current as typeof STATUS_CYCLE[number])
    day.statusColors = { ...day.statusColors, [category]: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] }
  }

  function addLesson(dayId: string, category: LessonCategory) {
    const day = schedule.value.find(d => d.id === dayId)
    if (!day) return
    day.lessons[category].push({
      id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startSurah: 'النبأ', startAyah: 1, endSurah: 'النبأ', endAyah: 5
    })
  }

  function updateLesson(dayId: string, category: LessonCategory, lessonId: string, updates: Partial<LessonItem>) {
    const day = schedule.value.find(d => d.id === dayId)
    if (!day) return
    const idx = day.lessons[category].findIndex(l => l.id === lessonId)
    if (idx !== -1) day.lessons[category][idx] = { ...day.lessons[category][idx], ...updates }
  }

  function removeLesson(dayId: string, category: LessonCategory, lessonId: string) {
    const day = schedule.value.find(d => d.id === dayId)
    if (!day) return
    day.lessons[category] = day.lessons[category].filter(l => l.id !== lessonId)
  }

  function moveLesson(
    sourceDayId: string, sourceCategory: LessonCategory, lessonId: string,
    targetDayId: string, targetCategory: LessonCategory
  ) {
    const sourceDay = schedule.value.find(d => d.id === sourceDayId)
    const targetDay = schedule.value.find(d => d.id === targetDayId)
    if (!sourceDay || !targetDay) return
    const lessonIdx = sourceDay.lessons[sourceCategory].findIndex(l => l.id === lessonId)
    if (lessonIdx === -1) return
    const lesson = sourceDay.lessons[sourceCategory][lessonIdx]
    if (targetDay.lessons[targetCategory].length > 0) {
      const targetLesson = targetDay.lessons[targetCategory][0]
      sourceDay.lessons[sourceCategory].splice(lessonIdx, 1, targetLesson)
      targetDay.lessons[targetCategory] = [lesson]
    }
    else {
      sourceDay.lessons[sourceCategory].splice(lessonIdx, 1)
      targetDay.lessons[targetCategory].push(lesson)
    }
  }

  function addDay() {
    schedule.value.push({
      id: `day-${Date.now()}`,
      day: 'يوم جديد',
      date: '',
      lessons: { mem: [], near: [], far: [] },
      statusColors: { mem: 'bg-[#86A3B8]', near: 'bg-[#86A3B8]', far: 'bg-[#86A3B8]' }
    })
  }

  function deleteSelectedRows() {
    schedule.value = schedule.value.filter(d => !selectedRowIds.value.has(d.id))
    selectedRowIds.value = new Set()
  }

  function copySelectedRows() {
    clipboard.value = schedule.value
      .filter(d => selectedRowIds.value.has(d.id))
      .map(d => JSON.parse(JSON.stringify(d)))
  }

  function pasteRows() {
    const pasted = clipboard.value.map(d => ({
      ...JSON.parse(JSON.stringify(d)),
      id: `day-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }))
    schedule.value.push(...pasted)
  }

  return {
    schedule,
    scheduleWithDates,
    selectedWeekStart,
    planStatus,
    selectedRowIds,
    clipboard,
    isEditMode,
    selectedStudent,
    selectedCount,
    hasSelection,
    allSelected,
    changeWeek,
    saveAsDraft,
    approvePlan,
    startEditing,
    cancelEditing,
    toggleSelectRow,
    toggleSelectAll,
    updateDay,
    cycleStatus,
    addLesson,
    updateLesson,
    removeLesson,
    moveLesson,
    addDay,
    deleteSelectedRows,
    copySelectedRows,
    pasteRows
  }
}
