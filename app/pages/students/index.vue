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

    <!-- No parent box: the cards stand alone; the table brings its own border. -->
    <div>
      <StudentResults />
      <div v-if="showProgress" class="pt-4">
        <StudentProgressFooter />
      </div>
    </div>
  </div>
</template>
