import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import type { Student } from '~/types'

type SortKey = 'newest' | 'nameAsc' | 'joinDateDesc'
type ViewMode = 'grid' | 'table'
type StatusFilter = Student['status'] | null

const PAGE_SIZE = 12

const filterStatus = ref<StatusFilter>(null)
const sortKey = ref<SortKey>('newest')
const viewMode = ref<ViewMode>('grid')
const visibleCount = ref(PAGE_SIZE)

let watchScope: EffectScope | null = null

export function useStudentsView() {
  const { students, searchQuery } = useStudents()

  const searchFiltered = computed(() =>
    students.value.filter(student =>
      !searchQuery.value || student.name.includes(searchQuery.value)
    )
  )

  const filteredStudents = computed(() =>
    searchFiltered.value.filter(student =>
      filterStatus.value === null || student.status === filterStatus.value
    )
  )

  const sortedStudents = computed(() => {
    const arr = [...filteredStudents.value]
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

  const visibleStudents = computed(() => sortedStudents.value.slice(0, visibleCount.value))

  const filterCounts = computed(() => ({
    all: searchFiltered.value.length,
    active: searchFiltered.value.filter(s => s.status === 'active').length,
    inactive: searchFiltered.value.filter(s => s.status === 'inactive').length,
    graduated: searchFiltered.value.filter(s => s.status === 'graduated').length
  }))

  const summary = computed(() => {
    const total = students.value.length
    const active = students.value.filter(s => s.status === 'active').length
    const inactive = students.value.filter(s => s.status === 'inactive').length
    const graduated = students.value.filter(s => s.status === 'graduated').length
    const avgHifzCapacity = total
      ? Math.round(students.value.reduce((sum, s) => sum + s.dailyHifzPagesCapacity, 0) / total)
      : 0
    return { total, active, inactive, graduated, avgHifzCapacity }
  })

  const loadProgress = computed(() =>
    Math.round((sortedStudents.value.length / Math.max(students.value.length, 1)) * 100)
  )

  const hasMore = computed(() => sortedStudents.value.length > visibleCount.value)

  function clearFilters() {
    searchQuery.value = ''
    filterStatus.value = null
  }

  function loadMore() {
    visibleCount.value += PAGE_SIZE
  }

  if (!watchScope) {
    watchScope = effectScope(true)
    watchScope.run(() => {
      watch([searchQuery, filterStatus, sortKey], () => {
        visibleCount.value = PAGE_SIZE
      })
    })
  }

  return {
    filterStatus,
    sortKey,
    viewMode,
    visibleCount,
    searchFiltered,
    filteredStudents,
    sortedStudents,
    visibleStudents,
    filterCounts,
    summary,
    loadProgress,
    hasMore,
    clearFilters,
    loadMore
  }
}
