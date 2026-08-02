import type {
  ApiStudentHalaqaItem,
  ApiSupervisorHalaqaItem,
  ApiTeacherHalaqaItem
} from '~/types'

export function useReverseHalaqaLookup() {
  const api = useApi()
  const requests = useAbortController()

  // Each lookup is re-triggered when its id argument changes; aborting the prior
  // in-flight request stops a stale response from resolving out of order. A
  // superseded call resolves to `undefined` — callers treat that as "ignore".
  function teacherHalaqat(userId: number) {
    return requests.run('teacherHalaqat', signal =>
      api<ApiTeacherHalaqaItem[]>(`/users/${userId}/halaqat`, { signal }))
  }

  function supervisorHalaqat(userId: number) {
    return requests.run('supervisorHalaqat', signal =>
      api<ApiSupervisorHalaqaItem[]>(`/users/${userId}/supervised-halaqat`, { signal }))
  }

  function studentHalaqat(studentId: number) {
    return requests.run('studentHalaqat', signal =>
      api<ApiStudentHalaqaItem[]>(`/students/${studentId}/halaqat`, { signal }))
  }

  return { teacherHalaqat, supervisorHalaqat, studentHalaqat }
}
