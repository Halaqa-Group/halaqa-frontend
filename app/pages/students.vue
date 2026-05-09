<script setup lang="ts">
const { students, isLoading, fetchStudents } = useStudents()
const { sortedStudents, filterHalaqaId } = useStudentsView()

const showSummary = computed(() => !isLoading.value && students.value.length > 0)
const showProgress = computed(() =>
  !isLoading.value && students.value.length > 0 && sortedStudents.value.length > 0
)

function loadAll(halaqaId?: number) {
  fetchStudents(halaqaId)
  // fetchStudentsStats(halaqaId) — backend endpoint not ready
}

watch(filterHalaqaId, (newId) => {
  loadAll(newId ?? undefined)
})

onMounted(() => {
  loadAll(filterHalaqaId.value ?? undefined)
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
