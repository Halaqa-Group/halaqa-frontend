<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.students.title' }
  ]
})

const { students, fetchStudents, fetchSummarySnapshot, searchQuery } = useStudents()
const { sortedStudents, filterStatus } = useStudentsView()
const { selectedHalaqaId } = useGlobalHalaqa()

const showSummary = computed(() => students.value.length > 0)
const showProgress = computed(() =>
  students.value.length > 0 && sortedStudents.value.length > 0
)

function loadAll() {
  const status = filterStatus.value
  const isDeleted = status === 'deleted'
  fetchStudents({
    halaqaId: selectedHalaqaId.value ?? undefined,
    q: searchQuery.value || undefined,
    status: status && status !== 'deleted' ? status : undefined,
    includeDeleted: isDeleted || undefined
  })
}

watch([selectedHalaqaId, filterStatus], () => loadAll())

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadAll(), 300)
})

onMounted(() => {
  fetchSummarySnapshot()
  loadAll()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <StudentFilterBar />

    <!-- Card chrome only ≥sm; on mobile the cards stand alone (no box-in-a-box). -->
    <div class="overflow-hidden sm:rounded-xl sm:border sm:border-default sm:bg-default">
      <StudentResults />
      <div v-if="showProgress" class="border-t border-default px-0 py-3 sm:px-6 sm:py-4">
        <StudentProgressFooter />
      </div>
    </div>
  </div>
</template>
