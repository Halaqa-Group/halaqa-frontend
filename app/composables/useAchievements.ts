import { computed, ref } from 'vue'
import type { ApiAchievement, ApiAttendance, ApiStudent, ApiStudentListResult, StudentWithAttendance, CreateAchievementDto } from '~/types'

const students = ref<StudentWithAttendance[]>([])
const selectedStudent = ref<StudentWithAttendance | null>(null)
const achievements = ref<ApiAchievement[]>([])
const _today = new Date()
const selectedDate = ref(`${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, '0')}-${String(_today.getDate()).padStart(2, '0')}`)
const isLoading = ref(false)
const isSaving = ref(false)

export function useAchievements() {
  const api = useApi()
  const { user } = useAuth()

  /**
   * Loads students enrolled in the halaqa and their attendance status for the selected date.
   * Students come from GET /students?halaqa_id=… (paginated, snake_case per backend contract).
   * Attendance is still mocked: halaqa-backend has no AttendanceModule yet — see
   * halaqa-backend/src/modules/achievements/stubs/attendance-query.stub.ts. The attendance
   * call is wrapped in try/catch so a 404 from a future real backend still lets the picker
   * render (students show with attendanceStatus = null).
   */
  async function loadStudents(halaqaId: number, date: string) {
    selectedDate.value = date
    isLoading.value = true

    try {
      const [studentsData, attendanceData] = await Promise.all([
        api<ApiStudentListResult | ApiStudent[]>(`/students?halaqa_id=${halaqaId}&limit=100`),
        api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&date=${date}`).catch(() => [])
      ])

      const studentItems: ApiStudent[] = Array.isArray(studentsData) ? studentsData : studentsData.items

      const attendanceMap = new Map<number, ApiAttendance>(
        attendanceData.map((a: ApiAttendance) => [a.student_id, a])
      )

      const allStudents: StudentWithAttendance[] = studentItems.map((s: ApiStudent) => {
        const attendance = attendanceMap.get(s.id)
        return {
          id: s.id,
          name: s.name,
          avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
          attendanceStatus: attendance ? attendance.status : null
        }
      })

      students.value = allStudents

      if (selectedStudent.value && !students.value.find(s => s.id === selectedStudent.value!.id)) {
        selectedStudent.value = null
        achievements.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Selects a student and loads their achievements for the selected date
   */
  async function selectStudent(student: StudentWithAttendance, halaqaId: number) {
    selectedStudent.value = student
    await loadAchievements(student.id, halaqaId)
  }

  /**
   * Loads achievements for a specific student on the selected date
   */
  async function loadAchievements(studentId: number, halaqaId: number) {
    isLoading.value = true
    try {
      achievements.value = await api<ApiAchievement[]>(
        `/achievements?studentId=${studentId}&halaqaId=${halaqaId}&date=${selectedDate.value}`
      )
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Creates a new achievement
   * Backend automatically triggers reconciliation after creation
   */
  async function addAchievement(data: CreateAchievementDto) {
    isSaving.value = true
    try {
      const newAchievement = await api<ApiAchievement>('/achievements', {
        method: 'POST',
        body: { ...data, date: selectedDate.value }
      })

      // Add to local list
      achievements.value.push(newAchievement)

      return newAchievement
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Updates an existing achievement
   */
  async function updateAchievement(id: number, data: CreateAchievementDto) {
    isSaving.value = true
    try {
      const updated = await api<ApiAchievement>(`/achievements/${id}`, {
        method: 'PATCH',
        body: data
      })
      const idx = achievements.value.findIndex(a => a.id === id)
      if (idx !== -1) achievements.value[idx] = updated
      return updated
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Deletes an achievement
   */
  async function deleteAchievement(id: number) {
    await api(`/achievements/${id}`, {
      method: 'DELETE'
    })

    // Remove from local list
    achievements.value = achievements.value.filter(a => a.id !== id)
  }

  /**
   * Resets all state (useful when changing halaqa/date)
   */
  function reset() {
    students.value = []
    selectedStudent.value = null
    achievements.value = []
  }

  // Computed values
  const hasStudents = computed(() => students.value.length > 0)
  const achievementsCount = computed(() => achievements.value.length)
  const totalAchievementsToday = computed(() => {
    // Could be expanded to show total across all students if needed
    return achievements.value.length
  })

  return {
    // State
    students,
    selectedStudent,
    achievements,
    selectedDate,
    isLoading,
    isSaving,

    // Computed
    hasStudents,
    achievementsCount,
    totalAchievementsToday,

    // Methods
    loadStudents,
    selectStudent,
    loadAchievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    reset
  }
}
