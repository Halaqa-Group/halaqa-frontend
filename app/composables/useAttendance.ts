import { computed, ref } from 'vue'
import { MOCK_STUDENTS, SURAHS } from '~/data/constants'
import type { AttendanceStatus } from '~/types'

interface AttendanceRow {
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
  mistakes: number
  rating: number
  surah: string
}

const sessionNotes = ref('')
const attendanceRows = ref<AttendanceRow[]>(
  MOCK_STUDENTS.slice(0, 3).map(s => ({
    studentId: s.id,
    name: s.name,
    avatar: s.avatar,
    currentSurah: s.currentSurah,
    status: 'present' as AttendanceStatus,
    mistakes: 0,
    rating: 0,
    surah: SURAHS[0]
  }))
)

export function useAttendance() {
  function setStatus(studentId: string, status: AttendanceStatus) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.status = status
  }

  function addMistake(studentId: string) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.mistakes++
  }

  function removeMistake(studentId: string) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row && row.mistakes > 0) row.mistakes--
  }

  function setRating(studentId: string, rating: number) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.rating = rating
  }

  function setSurah(studentId: string, surah: string) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.surah = surah
  }

  function appendNote(tag: string) {
    sessionNotes.value = sessionNotes.value
      ? `${sessionNotes.value}، ${tag}`
      : tag
  }

  const presentCount = computed(() => attendanceRows.value.filter(r => r.status === 'present').length)
  const totalMistakes = computed(() => attendanceRows.value.reduce((sum, r) => sum + r.mistakes, 0))
  const attendanceRate = computed(() =>
    attendanceRows.value.length > 0
      ? Math.round((presentCount.value / attendanceRows.value.length) * 100)
      : 0
  )

  return {
    attendanceRows,
    sessionNotes,
    presentCount,
    totalMistakes,
    attendanceRate,
    setStatus,
    addMistake,
    removeMistake,
    setRating,
    setSurah,
    appendNote
  }
}
