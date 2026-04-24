import { computed, ref } from 'vue'
import type { ApiAchievement, ApiAttendance, ApiStudent, StudentWithAttendance, CreateAchievementDto } from '~/types'

const students = ref<StudentWithAttendance[]>([])
const selectedStudent = ref<StudentWithAttendance | null>(null)
const achievements = ref<ApiAchievement[]>([])
const selectedHalaqaId = ref<number | null>(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const isLoading = ref(false)
const isSaving = ref(false)

export function useAchievements() {
  const api = useApi()
  const { user } = useAuth()

  /**
   * Loads students enrolled in the halaqa and their attendance status for the selected date
   * Filters to show only Present/Late students
   */
  async function loadStudents(halaqaId: number, date: string) {
    selectedHalaqaId.value = halaqaId
    selectedDate.value = date
    isLoading.value = true

    try {
      const schoolId = user.value?.school_id ?? 1

      // Fetch students and attendance in parallel
      const [studentsData, attendanceData] = await Promise.all([
        api<ApiStudent[]>(`/students?halaqaId=${halaqaId}&schoolId=${schoolId}`),
        api<ApiAttendance[]>(`/attendance?halaqaId=${halaqaId}&date=${date}`)
      ])

      // Create attendance map for quick lookup
      const attendanceMap = new Map<number, ApiAttendance>(
        attendanceData.map((a: ApiAttendance) => [a.student_id, a])
      )

      // Map students with their attendance status
      const allStudents: StudentWithAttendance[] = studentsData.map((s: ApiStudent) => {
        const attendance = attendanceMap.get(s.id)
        return {
          id: s.id,
          name: s.name,
          avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`,
          attendanceStatus: attendance ? attendance.status : null
        }
      })

      // Filter to only Present/Late students for achievements entry
      students.value = allStudents.filter(s =>
        s.attendanceStatus === 'Present' || s.attendanceStatus === 'Late'
      )

      // Reset selected student if not in filtered list
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
  async function selectStudent(student: StudentWithAttendance) {
    selectedStudent.value = student
    await loadAchievements(student.id)
  }

  /**
   * Loads achievements for a specific student on the selected date
   */
  async function loadAchievements(studentId: number) {
    if (!selectedHalaqaId.value) return

    isLoading.value = true
    try {
      achievements.value = await api<ApiAchievement[]>(
        `/achievements?studentId=${studentId}&halaqaId=${selectedHalaqaId.value}&date=${selectedDate.value}`
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
        body: data
      })

      // Add to local list
      achievements.value.push(newAchievement)

      return newAchievement
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
    selectedHalaqaId,
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
    deleteAchievement,
    reset
  }
}
