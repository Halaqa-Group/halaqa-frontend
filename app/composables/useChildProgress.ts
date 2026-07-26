import type {
  ApiAchievement, ApiAttendance, ApiStudent, ApiWeeklyPlan, Student
} from '~/types'
import { unwrapList } from '~/utils/api/list'

function apiToStudent(s: ApiStudent): Student {
  return {
    id: String(s.id),
    name: s.name,
    firstName: s.first_name ?? '',
    secondName: s.second_name ?? '',
    thirdName: s.third_name ?? '',
    familyName: s.family_name ?? '',
    gender: s.gender ?? 'male',
    status: s.status,
    idNumber: s.id_number ?? null,
    phoneCountryCode: s.phone_country_code ?? null,
    phone: s.phone ?? null,
    phoneE164: s.phone_e164 ?? null,
    dob: s.dob,
    joinDate: s.join_date,
    deletedAt: s.deleted_at ?? null,
    notes: s.notes,
    dailyHifzPagesCapacity: Number(s.daily_hifz_pages_capacity) || 0,
    dailyNearPagesCapacity: Number(s.daily_near_pages_capacity) || 0,
    dailyFarPagesCapacity: Number(s.daily_far_pages_capacity) || 0,
    photoUrl: s.photo_url,
    guardians: s.guardians ?? [],
    avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useChildProgress(childId: MaybeRefOrGetter<number | string>) {
  const api = useApi()
  const apiError = useApiError()

  const child = ref<Student | null>(null)
  const achievements = ref<ApiAchievement[]>([])
  const weeklyPlans = ref<ApiWeeklyPlan[]>([])
  const attendance = ref<ApiAttendance[]>([])

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function readError(e: any, fallback: string): string {
    return apiError.format(e, fallback)
  }

  async function fetchChild() {
    const id = toValue(childId)
    child.value = apiToStudent(await api<ApiStudent>(`/me/children/${id}`))
  }

  async function fetchAchievements() {
    const id = toValue(childId)
    const raw = await api<unknown>(`/achievements?student_id=${id}&limit=100`)
    achievements.value = unwrapList<ApiAchievement>(raw)
  }

  async function fetchWeeklyPlans() {
    const id = toValue(childId)
    const raw = await api<unknown>(`/weekly-plans?student_id=${id}&limit=100`)
    weeklyPlans.value = unwrapList<ApiWeeklyPlan>(raw)
  }

  async function fetchAttendance() {
    const id = toValue(childId)
    const raw = await api<unknown>(`/attendance/students?student_id=${id}&limit=100`)
    attendance.value = unwrapList<ApiAttendance>(raw)
  }

  async function fetchAll() {
    isLoading.value = true
    error.value = null
    try {
      // The child fetch gates access: a 404 here means "not your child" and we
      // surface it without firing the domain requests.
      await fetchChild()
      await Promise.all([
        fetchAchievements().catch(() => { achievements.value = [] }),
        fetchWeeklyPlans().catch(() => { weeklyPlans.value = [] }),
        fetchAttendance().catch(() => { attendance.value = [] })
      ])
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status
      error.value = status === 404
        ? readError(e, 'لم يتم العثور على هذا الابن ضمن حسابك.')
        : readError(e, 'حدث خطأ أثناء تحميل بيانات الابن')
    } finally {
      isLoading.value = false
    }
  }

  return {
    child,
    achievements,
    weeklyPlans,
    attendance,
    isLoading,
    error,
    fetchAll
  }
}
