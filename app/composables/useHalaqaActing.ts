import type { ApiTeacherAssignment } from '~/types'

export interface SubstitutePayload {
  teacher_user_id: number
  acting_starts_at: string
  acting_ends_at: string
  notes?: string
}

export interface ExtendActingPayload {
  acting_ends_at: string
}

export function useHalaqaActing() {
  const api = useApi()

  async function substitute(halaqaId: number, payload: SubstitutePayload) {
    return api<ApiTeacherAssignment>(`/halaqat/${halaqaId}/acting/substitute`, {
      method: 'POST',
      body: payload
    })
  }

  async function extend(halaqaId: number, payload: ExtendActingPayload) {
    return api<ApiTeacherAssignment>(`/halaqat/${halaqaId}/acting/extend`, {
      method: 'PATCH',
      body: payload
    })
  }

  async function endActing(halaqaId: number) {
    return api<{ message: string }>(`/halaqat/${halaqaId}/acting/end`, { method: 'POST' })
  }

  return { substitute, extend, endActing }
}
