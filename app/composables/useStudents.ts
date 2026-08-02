import { ref } from 'vue'
import {
  LazyStudentFormModal,
  LazyCommonConfirmDialog
} from '#components'
import type {
  Student,
  ApiGuardian,
  ApiStudent,
  ApiStudentListResult
} from '~/types'

const students = ref<Student[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const totalStudents = ref(0)
const summarySnapshot = ref<{ total: number, active: number, inactive: number, graduated: number } | null>(null)
const PAGE_LIMIT = 20
const currentPage = ref(1)
const isLoadingMore = ref(false)

function apiToStudent(s: ApiStudent): Student {
  const hifz = Number(s.daily_hifz_pages_capacity) || 0
  const near = Number(s.daily_near_pages_capacity) || 0
  const far = Number(s.daily_far_pages_capacity) || 0
  const id = String(s.id)
  const guardians = s.guardians ?? []

  return {
    id,
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
    dailyHifzPagesCapacity: hifz,
    dailyNearPagesCapacity: near,
    dailyFarPagesCapacity: far,
    photoUrl: s.photo_url,
    guardians,
    avatar: s.photo_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(s.name)}`
  }
}

export function useStudents() {
  const api = useApi()
  const requests = useAbortController()
  const toast = useToast()
  const { t } = useI18n()
  const apiError = useApiError()
  const overlay = useOverlay()

  interface ListFilters {
    halaqaId?: number
    q?: string
    status?: 'active' | 'inactive' | 'graduated'
    includeDeleted?: boolean
  }

  function buildListUrl(page: number, filters: ListFilters = {}) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(PAGE_LIMIT))
    if (filters.halaqaId) params.set('halaqa_id', String(filters.halaqaId))
    if (filters.q && filters.q.trim()) params.set('q', filters.q.trim())
    if (filters.status) params.set('status', filters.status)
    if (filters.includeDeleted) params.set('include_deleted', 'true')
    return `/students?${params}`
  }

  async function fetchStudents(filters: ListFilters = {}) {
    const signal = requests.begin('list')
    isLoading.value = true
    error.value = null
    currentPage.value = 1
    try {
      const data = await api<ApiStudentListResult | ApiStudent[]>(buildListUrl(1, filters), { signal })
      const items = Array.isArray(data) ? data : data.items
      const mapped = items.map(apiToStudent)
      students.value = mapped
      totalStudents.value = Array.isArray(data) ? items.length : data.total
    } catch (e: any) {
      if (signal.aborted || isAbortError(e)) return
      error.value = apiError.format(e, 'حدث خطأ أثناء تحميل الطلاب')
    } finally {
      if (!signal.aborted) isLoading.value = false
      requests.end('list', signal)
    }
  }

  async function fetchSummarySnapshot() {
    if (summarySnapshot.value) return
    const signal = requests.begin('summary')
    try {
      const data = await api<ApiStudentListResult | ApiStudent[]>(buildListUrl(1, {}), { signal })
      const items = Array.isArray(data) ? data : data.items
      const mapped = items.map(apiToStudent)
      const total = Array.isArray(data) ? items.length : data.total
      summarySnapshot.value = {
        total,
        active: mapped.filter(s => s.status === 'active').length,
        inactive: mapped.filter(s => s.status === 'inactive').length,
        graduated: mapped.filter(s => s.status === 'graduated').length
      }
    } catch {
    } finally {
      requests.end('summary', signal)
    }
  }

  async function loadMoreStudents(filters: ListFilters = {}) {
    if (isLoadingMore.value || isLoading.value) return
    if (students.value.length >= totalStudents.value) return
    isLoadingMore.value = true
    try {
      const nextPage = currentPage.value + 1
      const data = await api<ApiStudentListResult | ApiStudent[]>(buildListUrl(nextPage, filters))
      const items = Array.isArray(data) ? data : data.items
      const seen = new Set(students.value.map(s => s.id))
      const incoming = items.map(apiToStudent).filter(s => !seen.has(s.id))
      students.value = [...students.value, ...incoming]
      totalStudents.value = Array.isArray(data) ? students.value.length : data.total
      currentPage.value = nextPage
    } catch (e: any) {
      toast.add({ title: apiError.format(e, 'حدث خطأ أثناء تحميل المزيد'), color: 'error' })
    } finally {
      isLoadingMore.value = false
    }
  }

  const hasMoreStudents = computed(() => students.value.length < totalStudents.value)

  async function createStudent(dto: Record<string, any>) {
    const data = await api<ApiStudent>('/students', {
      method: 'POST',
      body: dto
    })
    students.value.unshift(apiToStudent(data))
    totalStudents.value += 1
    return { data, warnings: api.lastWarnings.value.slice() }
  }

  async function openView(student: Student) {
    return navigateTo(`/students/${student.id}`)
  }

  function openAdd() {
    overlay.create(LazyStudentFormModal, {
      destroyOnClose: true,
      props: { mode: 'add', student: null, loading: false }
    }).open()
  }

  async function openEdit(student: Student) {
    const modal = overlay.create(LazyStudentFormModal, {
      destroyOnClose: true,
      props: { mode: 'edit', student: null, loading: true }
    })
    modal.open()
    try {
      const data = await api<ApiStudent>(`/students/${student.id}`)
      modal.patch({ student: data, loading: false })
    } catch (e) {
      modal.close()
      toast.add({ title: apiError.format(e, t('pages.students.addModal.loadFailed')), color: 'error' })
    }
  }

  async function updateStudent(id: number, dto: Record<string, any>) {
    const data = await api<ApiStudent>(`/students/${id}`, {
      method: 'PATCH',
      body: dto
    })
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx !== -1) {
      students.value[idx] = apiToStudent(data)
    }
    return { data, warnings: api.lastWarnings.value.slice() }
  }

  async function fetchStudent(id: number | string) {
    const data = await api<ApiStudent>(`/students/${id}`)
    return apiToStudent(data)
  }

  async function refetchStudent(id: number | string): Promise<Student> {
    const data = await api<ApiStudent>(`/students/${id}`)
    const mapped = apiToStudent(data)
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx !== -1) students.value[idx] = mapped
    return mapped
  }

  async function deleteStudent(id: number | string) {
    await api(`/students/${id}`, { method: 'DELETE' })
    students.value = students.value.filter(s => s.id !== String(id))
    totalStudents.value = Math.max(totalStudents.value - 1, 0)
  }

  async function restoreStudent(id: number | string) {
    const data = await api<ApiStudent>(`/students/${id}/restore`, { method: 'POST' })
    const normalized = apiToStudent(data)
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx === -1) students.value.unshift(normalized)
    else students.value[idx] = normalized
    totalStudents.value += idx === -1 ? 1 : 0
    return data
  }

  async function graduateStudent(id: number | string, dto?: { graduation_date?: string, notes?: string }) {
    const data = await api<ApiStudent>(`/students/${id}/graduate`, {
      method: 'POST',
      body: dto ?? {}
    })
    const idx = students.value.findIndex(s => s.id === String(id))
    if (idx !== -1) students.value[idx] = apiToStudent(data)
    return data
  }

  async function requestRestore(student: Student) {
    try {
      await restoreStudent(student.id)
      toast.add({ title: t('pages.students.actions.restoreSuccess'), color: 'success' })
    } catch (e: any) {
      toast.add({ title: apiError.format(e, t('pages.students.actions.restoreError')), color: 'error' })
    }
  }

  function requestDelete(student: Student) {
    const modal = overlay.create(LazyCommonConfirmDialog, {
      destroyOnClose: true,
      props: {
        'open': true,
        'title': t('pages.students.actions.deleteConfirmTitle'),
        'message': t('pages.students.actions.deleteConfirmMessage', { name: student.name }),
        'confirmLabel': t('pages.students.actions.deleteConfirm'),
        'destructive': true,
        'loading': false,
        'onUpdate:open': (val: boolean) => {
          if (!val) modal.close()
        },
        async onConfirm() {
          try {
            modal.patch({ loading: true })
            await deleteStudent(student.id)
            toast.add({ title: t('pages.students.actions.deleteSuccess'), color: 'success' })
            modal.patch({ open: false })
            modal.close()
          } catch (e: any) {
            modal.patch({ loading: false })
            toast.add({ title: apiError.format(e, t('pages.students.actions.deleteError')), color: 'error' })
          }
        }
      }
    })
    modal.open()
  }

  function requestGraduate(student: Student) {
    const modal = overlay.create(LazyCommonConfirmDialog, {
      destroyOnClose: true,
      props: {
        'open': true,
        'title': t('pages.students.actions.graduateConfirmTitle'),
        'message': t('pages.students.actions.graduateConfirmMessage', { name: student.name }),
        'confirmLabel': t('pages.students.actions.graduateConfirm'),
        'icon': 'i-lucide-graduation-cap',
        'loading': false,
        'onUpdate:open': (val: boolean) => {
          if (!val) modal.close()
        },
        async onConfirm() {
          try {
            modal.patch({ loading: true })
            await graduateStudent(student.id)
            toast.add({ title: t('pages.students.actions.graduateSuccess'), color: 'success' })
            modal.patch({ open: false })
            modal.close()
          } catch (e: any) {
            modal.patch({ loading: false })
            toast.add({ title: apiError.format(e, t('pages.students.actions.graduateError')), color: 'error' })
          }
        }
      }
    })
    modal.open()
  }

  async function fetchGuardians(studentId: number | string): Promise<ApiGuardian[]> {
    return api<ApiGuardian[]>(`/students/${studentId}/guardians`)
  }

  async function linkGuardian(studentId: number | string, dto: Record<string, any>) {
    return api<ApiGuardian>(`/students/${studentId}/guardians`, { method: 'POST', body: dto })
  }

  async function updateGuardian(studentId: number | string, guardianUserId: number | string, dto: Record<string, any>) {
    return api<ApiGuardian>(`/students/${studentId}/guardians/${guardianUserId}`, {
      method: 'PATCH',
      body: dto
    })
  }

  async function unlinkGuardian(studentId: number | string, guardianUserId: number | string) {
    await api(`/students/${studentId}/guardians/${guardianUserId}`, { method: 'DELETE' })
  }

  return {
    students,
    isLoading,
    isLoadingMore,
    error,
    totalStudents,
    hasMoreStudents,
    currentPage,
    summarySnapshot,
    searchQuery,
    fetchStudents,
    loadMoreStudents,
    fetchSummarySnapshot,
    fetchStudent,
    refetchStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    restoreStudent,
    graduateStudent,
    requestDelete,
    requestGraduate,
    requestRestore,
    fetchGuardians,
    linkGuardian,
    updateGuardian,
    unlinkGuardian,
    openView,
    openAdd,
    openEdit
  }
}
