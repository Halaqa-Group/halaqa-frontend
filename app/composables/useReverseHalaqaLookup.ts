import type {
  ApiStudentHalaqaItem,
  ApiSupervisorHalaqaItem,
  ApiTeacherHalaqaItem
} from '~/types'

export function useReverseHalaqaLookup() {
  const api = useApi()

  async function teacherHalaqat(userId: number) {
    return api<ApiTeacherHalaqaItem[]>(`/users/${userId}/halaqat`)
  }

  async function supervisorHalaqat(userId: number) {
    return api<ApiSupervisorHalaqaItem[]>(`/users/${userId}/supervised-halaqat`)
  }

  async function studentHalaqat(studentId: number) {
    return api<ApiStudentHalaqaItem[]>(`/students/${studentId}/halaqat`)
  }

  return { teacherHalaqat, supervisorHalaqat, studentHalaqat }
}
