<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { students, searchQuery, isLoading, error, fetchStudents, openAdd } = useStudents()
const { halaqat, fetchHalaqat } = useHalaqat()

const filterHalaqaId = ref<number | ''>('')
const filterStatus = ref('')

const filteredStudents = computed(() =>
  students.value.filter(s => {
    const matchSearch = !searchQuery.value || s.name.includes(searchQuery.value)
    const matchStatus = !filterStatus.value || s.status === filterStatus.value
    return matchSearch && matchStatus
  })
)

const statusOptions = [
  { label: 'الحالة', value: '' },
  { label: 'نشط', value: 'active' },
  { label: 'غير نشط', value: 'inactive' }
]

const halaqaOptions = computed(() => [
  { label: 'كل الحلقات', value: '' as number | '' },
  ...halaqat.value.map(h => ({ label: h.name, value: h.id as number | '' }))
])

const loadProgress = computed(() =>
  Math.round((filteredStudents.value.length / Math.max(students.value.length, 1)) * 100)
)

async function onHalaqaFilter() {
  await fetchStudents(filterHalaqaId.value ? Number(filterHalaqaId.value) : undefined)
}

onMounted(async () => {
  await Promise.all([fetchStudents(), fetchHalaqat()])
})
</script>

<template>
  <div>
    <!-- Screen header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div class="space-y-1">
        <span class="text-xs font-arabic font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          سجل المجتمع
        </span>
        <h2 class="display-lg font-arabic" style="color: var(--color-on-surface);">الطلاب</h2>
        <p class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
          قم بإدارة المتعلمين النشطين ومتابعة تقدمهم في الوقت الفعلي.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        class="font-arabic font-bold rounded-full shrink-0 px-6"
        @click="openAdd"
      >
        إضافة طالب جديد
      </UButton>
    </div>

    <!-- Filter bar -->
    <UCard :ui="{ root: 'mb-8', body: 'p-6 flex flex-wrap items-center gap-4' }">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        placeholder="ابحث بالاسم..."
        size="lg"
        class="flex-1 min-w-72 font-arabic"
      />

      <div class="flex items-center gap-3 flex-wrap">
        <USelect
          v-model="filterHalaqaId"
          :items="halaqaOptions"
          size="lg"
          class="font-arabic min-w-40"
          @update:model-value="onHalaqaFilter"
        />

        <USelect
          v-model="filterStatus"
          :items="statusOptions"
          size="lg"
          class="font-arabic min-w-32"
        />
      </div>
    </UCard>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl p-6 text-center" style="background-color: #FCE4EC;">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2" style="color: #D81B60;" />
      <p class="font-arabic" style="color: #D81B60;">{{ error }}</p>
    </div>

    <!-- Student grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StudentCard
        v-for="student in filteredStudents"
        :key="student.id"
        :student="student"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!isLoading && !error && filteredStudents.length === 0" class="flex flex-col items-center gap-4 py-16">
      <UIcon name="i-lucide-users" class="w-12 h-12" style="color: var(--color-on-surface-variant);" />
      <p class="font-arabic" style="color: var(--color-on-surface-variant);">لا يوجد طلاب</p>
    </div>

    <!-- Load more / pagination -->
    <div v-if="!isLoading && students.length > 0" class="mt-12 text-center py-8">
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
          عرض {{ filteredStudents.length }} من {{ students.length }} طالباً
        </p>
        <div class="w-48 h-1.5 rounded-full overflow-hidden" style="background-color: var(--color-primary-container);">
          <div
            class="h-full rounded-full transition-all"
            style="background-color: var(--color-primary);"
            :style="{ width: `${loadProgress}%` }"
          />
        </div>
      </div>
    </div>
  </div>

  <StudentViewModal />
  <StudentAddModal />
</template>
