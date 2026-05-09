<script setup lang="ts">
const { students, fetchStudents, fetchSummarySnapshot, searchQuery } = useStudents()
const { sortedStudents, filterStatus } = useStudentsView()
const { selectedHalaqaId } = useGlobalHalaqa()

const showSummary = computed(() => students.value.length > 0)
const showProgress = computed(() =>
  students.value.length > 0 && sortedStudents.value.length > 0
)

function loadAll() {
  const isDeleted = filterStatus.value === 'deleted'
  fetchStudents({
    halaqaId: selectedHalaqaId.value ?? undefined,
    q: searchQuery.value || undefined,
    status: isDeleted ? undefined : (filterStatus.value ?? undefined),
    includeDeleted: isDeleted || undefined
  })
  // fetchStudentsStats(halaqaId) — backend endpoint not ready
}

// Halaqa + status: refetch immediately on change.
watch([selectedHalaqaId, filterStatus], () => loadAll())

// Search: debounce so we don't hammer the server on every keystroke.
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadAll(), 300)
})

onMounted(() => {
  // Frozen one-shot stats fetch — never refetched on filter changes.
  fetchSummarySnapshot()
  loadAll()
})
</script>

<template>
  <div>
    <StudentPageHeader />
    <StudentSummaryStats v-if="showSummary" />
    <StudentFilterBar />
    <StudentResults />
    <StudentProgressFooter v-if="showProgress" />
  </div>
</template>
