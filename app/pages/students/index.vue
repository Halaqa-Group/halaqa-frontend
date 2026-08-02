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

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <StudentResults />
      <template v-if="showProgress" #footer>
        <StudentProgressFooter />
      </template>
    </UCard>
  </div>
</template>
