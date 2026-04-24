import { computed, ref } from 'vue'
import type { AttendanceStatus } from '~/types'

interface AttendanceRow {
  studentId: string
  name: string
  avatar: string
  currentSurah: string
  status: AttendanceStatus
}

const sessionNotes = ref('')
const attendanceRows = ref<AttendanceRow[]>([])
const selectedHalaqaId = ref<number | null>(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const isLoading = ref(false)
const isSaving = ref(false)

function backendToStatus(status: string): AttendanceStatus {
  if (status === 'Present') return 'present'
  if (status === 'Late') return 'late'
  return 'absent'
}

function statusToBackend(status: AttendanceStatus): string {
  if (status === 'present') return 'Present'
  if (status === 'late') return 'Late'
  return 'Absent'
}

export function useAttendance() {
  const api = useApi()
  const { user } = useAuth()

  async function loadSession(halaqaId: number, date: string) {
    selectedHalaqaId.value = halaqaId
    selectedDate.value = date
    isLoading.value = true
    try {
      const [studentsData, existingData] = await Promise.all([
        api<any[]>(`/students?halaqaId=${halaqaId}`),
        api<any[]>(`/attendance?halaqaId=${halaqaId}&date=${date}`)
      ])
      const existingMap = new Map<number, any>(existingData.map((a: any) => [a.student_id, a]))
      attendanceRows.value = studentsData.map((s: any) => {
        const ex = existingMap.get(s.id)
        return {
          studentId: String(s.id),
          name: s.name,
          avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
          currentSurah: '—',
          status: ex ? backendToStatus(ex.status) : 'present' as AttendanceStatus
        }
      })
    }
    finally {
      isLoading.value = false
    }
  }

  async function submitSession() {
    if (!selectedHalaqaId.value) return
    isSaving.value = true
    try {
      await Promise.all(
        attendanceRows.value.map(row =>
          api('/attendance', {
            method: 'POST',
            body: {
              student_id: Number(row.studentId),
              halaqa_id: selectedHalaqaId.value,
              date: selectedDate.value,
              status: statusToBackend(row.status),
              notes: sessionNotes.value || null
            }
          })
        )
      )
    }
    finally {
      isSaving.value = false
    }
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    const row = attendanceRows.value.find(r => r.studentId === studentId)
    if (row) row.status = status
  }

  function appendNote(tag: string) {
    sessionNotes.value = sessionNotes.value
      ? `${sessionNotes.value}، ${tag}`
      : tag
  }

  const presentCount = computed(() => attendanceRows.value.filter(r => r.status === 'present').length)
  const attendanceRate = computed(() =>
    attendanceRows.value.length > 0
      ? Math.round((presentCount.value / attendanceRows.value.length) * 100)
      : 0
  )

  return {
    attendanceRows,
    sessionNotes,
    selectedHalaqaId,
    selectedDate,
    isLoading,
    isSaving,
    presentCount,
    attendanceRate,
    loadSession,
    submitSession,
    setStatus,
    appendNote
  }
}
