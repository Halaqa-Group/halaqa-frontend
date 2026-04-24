<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { students, searchQuery, isLoading, error, fetchStudents, openAdd } = useStudents()

const filterStatus = ref<string | null>(null)

const filteredStudents = computed(() =>
  students.value.filter(s => {
    const matchSearch = !searchQuery.value || s.name.includes(searchQuery.value)
    const matchStatus = filterStatus.value === null || s.status === filterStatus.value
    return matchSearch && matchStatus
  })
)

const statusFilters: { label: string; value: string | null }[] = [
  { label: 'الكل', value: null },
  { label: 'نشط', value: 'active' },
  { label: 'غير نشط', value: 'inactive' }
]

const loadProgress = computed(() =>
  Math.round((filteredStudents.value.length / Math.max(students.value.length, 1)) * 100)
)

onMounted(() => fetchStudents())
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
    <div class="flex flex-wrap items-center gap-4 mb-8">
      <!-- Search -->
      <div class="relative flex-1 min-w-72">
        <UIcon
          name="i-lucide-search"
          class="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style="color: var(--color-on-surface-variant);"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ابحث بالاسم..."
          class="w-full pe-11 ps-4 py-3 rounded-[40px] text-base font-arabic outline-none transition-all focus:ring-2 focus:ring-primary/30"
          style="background-color: var(--color-surface-container-lowest); color: var(--color-on-surface); border: 1.5px solid var(--color-outline-variant);"
        >
      </div>

      <!-- Status pill toggle -->
      <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
        <button
          v-for="f in statusFilters"
          :key="String(f.value)"
          class="px-5 py-1.5 text-base font-arabic rounded-full transition-all cursor-pointer"
          :style="filterStatus === f.value ? 'background-color: #f5edf5; color: var(--color-primary);' : ''"
          :class="filterStatus === f.value
            ? 'font-semibold'
            : 'text-muted hover:bg-primary/8 hover:text-primary'"
          @click="filterStatus = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-[40px] p-6 text-center" style="background-color: #FCE4EC;">
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

    <!-- Progress indicator -->
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
  <StudentEditModal />
</template>
