<script setup lang="ts">
const { students, isLoading, fetchStudents } = useStudents()
const { sortedStudents } = useStudentsView()
const { selectedHalaqaId } = useGlobalHalaqa()

const showSummary = computed(() => !isLoading.value && students.value.length > 0)
const showProgress = computed(() =>
  !isLoading.value && students.value.length > 0 && sortedStudents.value.length > 0
)

watch(selectedHalaqaId, (newId) => {
  if (newId) fetchStudents(newId)
  else fetchStudents()
})

onMounted(() => {
  if (selectedHalaqaId.value) fetchStudents(selectedHalaqaId.value)
  else fetchStudents()
})
</script>

<template>
  <div>
    <StudentPageHeader />
    <StudentSummaryStats v-if="showSummary" />
    <StudentFilterBar />
    <StudentResults />
    <StudentProgressFooter v-if="showProgress" />

    <StudentViewModal />
    <StudentAddModal />
    <StudentEditModal />
    <StudentNotifyParentModal />
  </div>
</template>
