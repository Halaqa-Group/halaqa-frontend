import type { ApiStudent, Student } from '~/types'

// Parent-only feed. Backed by GET /me/children (and /me/children/:id), which
// is the only endpoint in the system that returns students from multiple
// schools — a parent's children may be enrolled at different schools.
//
// We keep this composable separate from useStudents because:
//   - the endpoint is different (/me/children vs /students)
//   - it returns ALL children (no pagination, no filters)
//   - parent-only role gate is enforced server-side
const children = ref<Student[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

function apiToStudent(s: ApiStudent): Student {
  const hifz = Number(s.daily_hifz_pages_capacity) || 0
  const near = Number(s.daily_near_pages_capacity) || 0
  const far = Number(s.daily_far_pages_capacity) || 0

  return {
    id: String(s.id),
    name: s.name,
    gender: s.gender ?? 'male',
    status: s.status,
    idNumber: s.id_number ?? null,
    dob: s.dob,
    joinDate: s.join_date,
    deletedAt: s.deleted_at ?? null,
    notes: s.notes,
    dailyHifzPagesCapacity: hifz,
    dailyNearPagesCapacity: near,
    dailyFarPagesCapacity: far,
    photoUrl: s.photo_url,
    guardians: s.guardians ?? [],
    avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useMyChildren() {
  const api = useApi()

  async function fetchChildren() {
    isLoading.value = true
    error.value = null
    try {
      // /me/children returns the same envelope shape as the list endpoint
      // ({ items, total, page, limit }). Unwrap the items array.
      const data = await api<{ items: ApiStudent[] } | ApiStudent[]>('/me/children')
      const items = Array.isArray(data) ? data : data.items
      children.value = items.map(apiToStudent)
    } catch (e: any) {
      const raw = e?.data?.message
      error.value = Array.isArray(raw) ? raw.join('، ') : (raw || 'حدث خطأ أثناء تحميل الأبناء')
    } finally {
      isLoading.value = false
    }
  }

  async function fetchChild(id: number | string): Promise<Student> {
    const data = await api<ApiStudent>(`/me/children/${id}`)
    return apiToStudent(data)
  }

  return {
    children,
    isLoading,
    error,
    fetchChildren,
    fetchChild
  }
}
