import type { ApiTeacherAssignment, EndReason } from '~/types'

export interface AssignTeacherPayload {
  teacher_user_id: number
  role: 'main' | 'assistant'
  start_date: string
  notes?: string
}

export interface UpdateAssignmentPayload {
  role?: 'main' | 'assistant'
  notes?: string
}

export interface EndAssignmentPayload {
  end_date: string
  end_reason: EndReason
  notes?: string
}

export interface SetActingPayload {
  acting_starts_at: string
  acting_ends_at: string
  notes?: string
}

export function useHalaqaTeachers() {
  const api = useApi()

  async function assignTeacher(halaqaId: number, payload: AssignTeacherPayload) {
    return api<ApiTeacherAssignment>(`/halaqat/${halaqaId}/teachers`, {
      method: 'POST',
      body: payload
    })
  }

  async function updateAssignment(halaqaId: number, assignmentId: number, payload: UpdateAssignmentPayload) {
    return api<ApiTeacherAssignment>(`/halaqat/${halaqaId}/teachers/${assignmentId}`, {
      method: 'PATCH',
      body: payload
    })
  }

  async function endAssignment(halaqaId: number, assignmentId: number, payload: EndAssignmentPayload) {
    return api<{ message: string }>(`/halaqat/${halaqaId}/teachers/${assignmentId}/end`, {
      method: 'POST',
      body: payload
    })
  }

  async function setActing(halaqaId: number, assignmentId: number, payload: SetActingPayload) {
    return api<ApiTeacherAssignment>(`/halaqat/${halaqaId}/teachers/${assignmentId}/acting`, {
      method: 'POST',
      body: payload
    })
  }

  return {
    assignTeacher,
    updateAssignment,
    endAssignment,
    setActing
  }
}
