import type { ApiStudentEnrollment } from '~/types'

export interface EnrollStudentPayload {
  student_id: number
  enrollment_date?: string
}

export interface RemoveStudentPayload {
  outcome: 'completed' | 'unenrolled'
  notes?: string
}

export interface TransferStudentPayload {
  student_id: number
  from_halaqa_id: number
  to_halaqa_id: number
  reason: string
  transfer_date?: string
}

export function useHalaqaStudents() {
  const api = useApi()

  async function listStudents(halaqaId: number) {
    return api<ApiStudentEnrollment[]>(`/halaqat/${halaqaId}/students`)
  }

  async function enrollStudent(halaqaId: number, payload: EnrollStudentPayload) {
    return api<ApiStudentEnrollment>(`/halaqat/${halaqaId}/students`, {
      method: 'POST',
      body: payload
    })
  }

  async function removeStudent(halaqaId: number, studentId: number, payload: RemoveStudentPayload) {
    return api<{ message: string }>(`/halaqat/${halaqaId}/students/${studentId}/remove`, {
      method: 'POST',
      body: payload
    })
  }

  async function transferStudent(payload: TransferStudentPayload) {
    return api<{ message: string }>(`/halaqat/${payload.to_halaqa_id}/students/transfer`, {
      method: 'POST',
      body: payload
    })
  }

  return { listStudents, enrollStudent, removeStudent, transferStudent }
}
