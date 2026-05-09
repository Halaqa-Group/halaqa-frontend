import type { Student } from '~/types'

type SortKey = 'newest' | 'nameAsc' | 'joinDateDesc'
type ViewMode = 'grid' | 'table'
// "deleted" is a frontend-only filter value: backend has no status='deleted'
// enum, just an `include_deleted=true` flag. We translate it at the request
// layer and filter client-side.
type StatusFilter = Student['status'] | 'deleted' | null

const filterStatus = ref<StatusFilter>(null)
const sortKey = ref<SortKey>('newest')
const viewMode = ref<ViewMode>('grid')

export function useStudentsView() {
  const {
    students,
    searchQuery,
    studentsStats,
    summarySnapshot,
    totalStudents,
    hasMoreStudents,
    isLoadingMore,
    loadMoreStudents
  } = useStudents()
  const { selectedHalaqaId } = useGlobalHalaqa()

  // Search, status, and halaqa filters are applied server-side. The "deleted"
  // pseudo-status is the exception — we ask the server for include_deleted and
  // filter to soft-deleted rows here so the rest of the loaded page is hidden.
  // Sort stays client-side (only re-orders the loaded page).
  const sortedStudents = computed(() => {
    const arr = filterStatus.value === 'deleted'
      ? students.value.filter(s => !!s.deletedAt)
      : [...students.value]
    switch (sortKey.value) {
      case 'joinDateDesc':
        return arr.sort((a, b) => b.joinDate.localeCompare(a.joinDate))
      case 'nameAsc':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      case 'newest':
      default:
        return arr
    }
  })

  // Stats are intentionally decoupled from active filters. Source preference:
  // 1. real /students/stats endpoint when wired,
  // 2. snapshot from the most recent unfiltered fetch,
  // 3. live counts of the loaded set (only meaningful when no filter is active).
  const summary = computed(() => {
    const stats = studentsStats.value
    if (stats) {
      return {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        graduated: stats.graduated
      }
    }
    if (summarySnapshot.value) return summarySnapshot.value
    return {
      total: students.value.length,
      active: students.value.filter(s => s.status === 'active').length,
      inactive: students.value.filter(s => s.status === 'inactive').length,
      graduated: students.value.filter(s => s.status === 'graduated').length
    }
  })

  // How much of the server-side total we've loaded — drives the footer bar.
  const loadProgress = computed(() => {
    const denom = Math.max(totalStudents.value, 1)
    return Math.round((students.value.length / denom) * 100)
  })

  function clearFilters() {
    searchQuery.value = ''
    filterStatus.value = null
  }

  function loadMore() {
    const isDeleted = filterStatus.value === 'deleted'
    return loadMoreStudents({
      halaqaId: selectedHalaqaId.value ?? undefined,
      q: searchQuery.value || undefined,
      status: isDeleted ? undefined : (filterStatus.value ?? undefined),
      includeDeleted: isDeleted || undefined
    })
  }

  return {
    filterStatus,
    sortKey,
    viewMode,
    sortedStudents,
    summary,
    loadProgress,
    hasMore: hasMoreStudents,
    isLoadingMore,
    clearFilters,
    loadMore
  }
}
