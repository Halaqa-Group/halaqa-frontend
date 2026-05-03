import { ref, computed } from 'vue'
import { STATUS_CYCLE, SURAH_NAMES } from '~/data/constants'
import { totalVersesInRange } from '~/utils/quran'
import type { DayData, LessonItem, LessonCategory, ApiWeeklyPlan } from '~/types'

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const ARABIC_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

export type PlanStatus = 'new' | 'draft' | 'approved'

// Reverse lookup: Arabic surah name → surah number
const SURAH_NUMBER_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(SURAH_NAMES).map(([num, name]) => [name, Number(num)])
)

function getSurahNumber(name: string): number {
  return SURAH_NUMBER_MAP[name] ?? 1
}

const TRACK_TYPE_MAP: Record<LessonCategory, 'Hifz' | 'Near' | 'Far'> = {
  mem: 'Hifz', near: 'Near', far: 'Far'
}

const TRACK_CAT_MAP: Record<string, LessonCategory> = {
  Hifz: 'mem', Near: 'near', Far: 'far'
}

function toAr(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number.parseInt(d)])
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

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Module-level shared state
const schedule = ref<DayData[]>(emptySchedule())
const selectedRowIds = ref<Set<string>>(new Set())
const clipboard = ref<DayData[]>([])
const isEditMode = ref(true)
const planStatus = ref<PlanStatus>('new')
const selectedStudent = ref<string>('')
const selectedWeekStart = ref<Date>(lastSaturday(new Date()))
const currentPlanId = ref<number | null>(null)
const isSaving = ref(false)
const isLoading = ref(false)
// Rest days are client-only for now (no backend field)
const restDayIds = ref<Set<string>>(new Set())
// Tracks saved items: lessonKey → backend item id (for diffing on re-save)
const savedItemKeys = ref<Map<string, number>>(new Map())

export function useSchedule() {
  const api = useApi()
  const { students } = useStudents()
  const { selectedHalaqaId } = useGlobalHalaqa()

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

  // Stable key for a lesson used to detect adds/removes without touching unchanged items
  function lessonKey(dayIndex: number, cat: LessonCategory, lesson: LessonItem): string {
    return `${dayIndex}|${cat}|${getSurahNumber(lesson.startSurah)}|${lesson.startAyah}|${getSurahNumber(lesson.endSurah)}|${lesson.endAyah}`
  }

  function resetState() {
    schedule.value = emptySchedule()
    planStatus.value = 'new'
    isEditMode.value = true
    selectedRowIds.value = new Set()
    clipboard.value = []
    currentPlanId.value = null
    savedItemKeys.value = new Map()
    restDayIds.value = new Set()
  }

  /**
   * Fetches the plan for the current student + halaqa + week from the DB.
   * If found, rebuilds schedule and savedItemKeys from it.
   * If not found, keeps the empty/fresh state.
   */
  async function loadPlan() {
    const studentObj = students.value.find(s => s.name === selectedStudent.value)
    if (!studentObj || !selectedHalaqaId.value) return

    isLoading.value = true
    try {
      const weekStart = formatDate(selectedWeekStart.value)
      const plans = await api<ApiWeeklyPlan[]>(
        `/plans?studentId=${Number(studentObj.id)}&halaqaId=${selectedHalaqaId.value}&weekStartDate=${weekStart}`
      )

      if (!plans?.length) return // No plan exists — keep fresh state

      const plan = plans[0]
      currentPlanId.value = plan.id
      planStatus.value = plan.status as PlanStatus
      isEditMode.value = false // View mode when loading an existing plan

      const newSchedule = emptySchedule()
      const newSavedKeys = new Map<string, number>()

      for (const item of (plan.items ?? [])) {
        const dayIndex = item.day_of_week
        if (dayIndex < 0 || dayIndex >= 7) continue
        const cat = TRACK_CAT_MAP[item.track_type]
        if (!cat) continue

        const lesson: LessonItem = {
          id: `plan-item-${item.id}`,
          startSurah: SURAH_NAMES[item.start_surah] ?? '',
          startAyah: item.start_verse,
          endSurah: SURAH_NAMES[item.end_surah] ?? '',
          endAyah: item.end_verse
        }

        newSchedule[dayIndex].lessons[cat].push(lesson)
        newSavedKeys.set(lessonKey(dayIndex, cat, lesson), item.id)
      }

      schedule.value = newSchedule
      savedItemKeys.value = newSavedKeys
    } catch (e) {
      console.warn('[useSchedule] failed to load plan, keeping fresh state', e)
    } finally {
      isLoading.value = false
    }
  }

  async function changeWeek(newStart: Date) {
    selectedWeekStart.value = new Date(newStart)
    resetState()
    await loadPlan()
  }

  async function saveAsDraft() {
    const studentObj = students.value.find(s => s.name === selectedStudent.value)
    if (!studentObj || !selectedHalaqaId.value) return

    isSaving.value = true
    try {
      const weekStart = formatDate(selectedWeekStart.value)

      if (!currentPlanId.value) {
        const plan = await api<{ id: number }>('/plans', {
          method: 'POST',
          body: {
            student_id: Number(studentObj.id),
            halaqa_id: selectedHalaqaId.value,
            week_start_date: weekStart
          }
        })
        currentPlanId.value = plan.id
      }

      // Build current lessons map
      const currentLessons = new Map<string, { dayIndex: number, cat: LessonCategory, lesson: LessonItem }>()
      for (let dayIndex = 0; dayIndex < schedule.value.length; dayIndex++) {
        for (const cat of (['mem', 'near', 'far'] as LessonCategory[])) {
          for (const lesson of schedule.value[dayIndex].lessons[cat]) {
            if (!lesson.startSurah || !lesson.endSurah) continue
            currentLessons.set(lessonKey(dayIndex, cat, lesson), { dayIndex, cat, lesson })
          }
        }
      }

      // DELETE removed items
      const deletes: Promise<unknown>[] = []
      for (const [key, itemId] of savedItemKeys.value) {
        if (!currentLessons.has(key)) {
          deletes.push(
            api(`/plans/${currentPlanId.value}/items/${itemId}`, { method: 'DELETE' })
              .then(() => { savedItemKeys.value.delete(key) })
          )
        }
      }
      await Promise.all(deletes)

      // POST new items only
      const adds: Promise<unknown>[] = []
      for (const [key, { dayIndex, cat, lesson }] of currentLessons) {
        if (!savedItemKeys.value.has(key)) {
          adds.push(
            api<{ id: number }>(`/plans/${currentPlanId.value}/items`, {
              method: 'POST',
              body: {
                day_of_week: dayIndex,
                track_type: TRACK_TYPE_MAP[cat],
                start_surah: getSurahNumber(lesson.startSurah),
                start_verse: lesson.startAyah,
                end_surah: getSurahNumber(lesson.endSurah),
                end_verse: lesson.endAyah
              }
            }).then((created) => { savedItemKeys.value.set(key, created.id) })
          )
        }
      }
      await Promise.all(adds)

      if (planStatus.value !== 'approved') planStatus.value = 'draft'
      isEditMode.value = false
    } finally {
      isSaving.value = false
    }
  }

  async function approvePlan() {
    if (!currentPlanId.value) return
    isSaving.value = true
    try {
      await api(`/plans/${currentPlanId.value}/submit`, { method: 'POST' })
      planStatus.value = 'approved'
      isEditMode.value = false
    } finally {
      isSaving.value = false
    }
  }

  function startEditing() { isEditMode.value = true }
  function cancelEditing() { isEditMode.value = false }

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
    } else {
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

  function isRestDay(dayId: string) {
    return restDayIds.value.has(dayId)
  }

  function toggleRestDay(dayId: string) {
    const next = new Set(restDayIds.value)
    if (next.has(dayId)) {
      next.delete(dayId)
    } else {
      next.add(dayId)
      const day = schedule.value.find(d => d.id === dayId)
      if (day) day.lessons = { mem: [], near: [], far: [] }
    }
    restDayIds.value = next
  }

  function applyColumnToAllDays(category: LessonCategory): boolean {
    const sourceDay = schedule.value.find(d =>
      d.lessons[category].length > 0 && !restDayIds.value.has(d.id)
    )
    if (!sourceDay) return false
    const sourceLessons = JSON.parse(JSON.stringify(sourceDay.lessons[category])) as LessonItem[]
    for (const day of schedule.value) {
      if (day.id === sourceDay.id) continue
      if (restDayIds.value.has(day.id)) continue
      day.lessons[category] = sourceLessons.map(l => ({
        ...l,
        id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }))
    }
    return true
  }

  function copyDayToAllDays(dayId: string): boolean {
    const sourceDay = schedule.value.find(d => d.id === dayId)
    if (!sourceDay) return false
    for (const day of schedule.value) {
      if (day.id === dayId) continue
      if (restDayIds.value.has(day.id)) continue
      day.lessons = {
        mem: sourceDay.lessons.mem.map(l => ({ ...l, id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}` })),
        near: sourceDay.lessons.near.map(l => ({ ...l, id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}` })),
        far: sourceDay.lessons.far.map(l => ({ ...l, id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}` }))
      }
    }
    return true
  }

  function clearAllDays() {
    for (const day of schedule.value) {
      day.lessons = { mem: [], near: [], far: [] }
    }
    restDayIds.value = new Set()
    selectedRowIds.value = new Set()
  }

  function setLesson(
    dayId: string,
    category: LessonCategory,
    lessonId: string | null,
    surah: string,
    startAyah: number,
    endAyah: number
  ) {
    const day = schedule.value.find(d => d.id === dayId)
    if (!day) return
    if (lessonId) {
      const idx = day.lessons[category].findIndex(l => l.id === lessonId)
      const existing = idx !== -1 ? day.lessons[category][idx] : undefined
      if (existing) {
        day.lessons[category][idx] = {
          ...existing,
          startSurah: surah,
          endSurah: surah,
          startAyah,
          endAyah
        }
        return
      }
    }
    day.lessons[category].push({
      id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startSurah: surah,
      startAyah,
      endSurah: surah,
      endAyah
    })
  }

  function clearLesson(dayId: string, category: LessonCategory, lessonId?: string) {
    const day = schedule.value.find(d => d.id === dayId)
    if (!day) return
    if (lessonId) {
      day.lessons[category] = day.lessons[category].filter(l => l.id !== lessonId)
    } else {
      day.lessons[category] = []
    }
  }

  const weeklySummary = computed(() => {
    let totalMemAyahs = 0
    let reviewSessions = 0
    let completedDays = 0

    for (const day of schedule.value) {
      if (restDayIds.value.has(day.id)) continue

      for (const lesson of day.lessons.mem) {
        totalMemAyahs += totalVersesInRange(
          getSurahNumber(lesson.startSurah), lesson.startAyah,
          getSurahNumber(lesson.endSurah), lesson.endAyah
        )
      }
      reviewSessions += day.lessons.near.length + day.lessons.far.length

      const filled =
        (day.lessons.mem.length > 0 ? 1 : 0)
        + (day.lessons.near.length > 0 ? 1 : 0)
        + (day.lessons.far.length > 0 ? 1 : 0)
      if (filled === 3) completedDays += 1
    }

    return {
      totalMemAyahs,
      reviewSessions,
      restDays: restDayIds.value.size,
      completedDays
    }
  })

  return {
    schedule,
    scheduleWithDates,
    selectedWeekStart,
    planStatus,
    selectedRowIds,
    clipboard,
    isEditMode,
    isSaving,
    isLoading,
    selectedStudent,
    currentPlanId,
    selectedCount,
    hasSelection,
    allSelected,
    restDayIds,
    weeklySummary,
    loadPlan,
    resetState,
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
    pasteRows,
    isRestDay,
    toggleRestDay,
    applyColumnToAllDays,
    copyDayToAllDays,
    clearAllDays,
    setLesson,
    clearLesson
  }
}
