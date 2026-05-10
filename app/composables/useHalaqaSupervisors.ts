import type { ApiSupervisorSummary } from '~/types'

export interface AssignSupervisorPayload {
  supervisor_user_id: number
}

export function useHalaqaSupervisors() {
  const api = useApi()

  async function assignSupervisor(halaqaId: number, payload: AssignSupervisorPayload) {
    return api<ApiSupervisorSummary>(`/halaqat/${halaqaId}/supervisors`, {
      method: 'POST',
      body: payload
    })
  }

  async function unassignSupervisor(halaqaId: number, supervisorUserId: number) {
    return api<{ message: string }>(`/halaqat/${halaqaId}/supervisors/${supervisorUserId}`, {
      method: 'DELETE'
    })
  }

  return { assignSupervisor, unassignSupervisor }
}
