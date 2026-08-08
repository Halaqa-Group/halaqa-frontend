import type { Student } from '~/types'

type SortKey = 'newest' | 'nameAsc' | 'nameDesc' | 'joinDateAsc' | 'joinDateDesc'
type SortField = 'name' | 'joinDate'
type ViewMode = 'grid' | 'table'
type StatusFilter = Student['status'] | 'deleted' | null

const filterStatus = ref<StatusFilter>(null)
const sortKey = ref<SortKey>('newest')
const viewMode = ref<ViewMode>('table')

export function useStudentsView() {
  const {
    students,
    searchQuery,
    summarySnapshot,
    totalStudents,
    hasMoreStudents,
    isLoadingMore,
    loadMoreStudents
  } = useStudents()
  const { selectedHalaqaId } = useGlobalHalaqa()

  const sortedStudents = computed(() => {
    const arr = filterStatus.value === 'deleted'
      ? students.value.filter(s => !!s.deletedAt)
      : [...students.value]
    switch (sortKey.value) {
      case 'joinDateAsc':
        return arr.sort((a, b) => a.joinDate.localeCompare(b.joinDate))
      case 'joinDateDesc':
        return arr.sort((a, b) => b.joinDate.localeCompare(a.joinDate))
      case 'nameAsc':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      case 'nameDesc':
        return arr.sort((a, b) => b.name.localeCompare(a.name, 'ar'))
      case 'newest':
      default:
        return arr
    }
  })

  // Column-header sorting: first click sorts ascending, second flips to
  // descending, a third clears back to the default "newest" order.
  function toggleSort(field: SortField) {
    const asc = `${field}Asc` as SortKey
    const desc = `${field}Desc` as SortKey
    if (sortKey.value === asc) sortKey.value = desc
    else if (sortKey.value === desc) sortKey.value = 'newest'
    else sortKey.value = asc
  }

  function sortDirection(field: SortField): 'asc' | 'desc' | null {
    if (sortKey.value === `${field}Asc`) return 'asc'
    if (sortKey.value === `${field}Desc`) return 'desc'
    return null
  }

  const summary = computed(() => {
    if (summarySnapshot.value) return summarySnapshot.value
    return {
      total: students.value.length,
      active: students.value.filter(s => s.status === 'active').length,
      inactive: students.value.filter(s => s.status === 'inactive').length,
      graduated: students.value.filter(s => s.status === 'graduated').length
    }
  })

  const loadProgress = computed(() => {
    const denom = Math.max(totalStudents.value, 1)
    return Math.round((students.value.length / denom) * 100)
  })

  function clearFilters() {
    searchQuery.value = ''
    filterStatus.value = null
  }

  function loadMore() {
    const status = filterStatus.value
    const isDeleted = status === 'deleted'
    return loadMoreStudents({
      halaqaId: selectedHalaqaId.value ?? undefined,
      q: searchQuery.value || undefined,
      status: status && status !== 'deleted' ? status : undefined,
      includeDeleted: isDeleted || undefined
    })
  }

  return {
    filterStatus,
    sortKey,
    toggleSort,
    sortDirection,
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
