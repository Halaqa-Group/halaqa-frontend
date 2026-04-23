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
      <button
        class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-arabic font-bold shadow-sm transition-all hover:opacity-90 active:scale-95 shrink-0"
        style="background-color: var(--color-primary); color: white;"
        @click="openAdd"
      >
        <UIcon name="i-lucide-plus" class="w-5 h-5" />
        إضافة طالب جديد
      </button>
    </div>

    <!-- Filter bar -->
    <div
      class="rounded-2xl p-6 mb-8 flex flex-wrap items-center gap-4"
      style="background-color: white; border: 1px solid #F0F0F0;"
    >
      <div class="flex-1 min-w-72 relative">
        <UIcon
          name="i-lucide-search"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
          style="color: var(--color-on-surface-variant);"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ابحث بالاسم..."
          class="w-full pr-12 pl-4 py-2.5 rounded-xl text-sm font-arabic outline-none transition-all"
          style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
        >
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <select
          v-model="filterHalaqaId"
          class="rounded-xl px-4 py-2.5 text-sm font-arabic outline-none cursor-pointer"
          style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
          @change="onHalaqaFilter"
        >
          <option value="">كل الحلقات</option>
          <option v-for="h in halaqat" :key="h.id" :value="h.id">{{ h.name }}</option>
        </select>

        <select
          v-model="filterStatus"
          class="rounded-xl px-4 py-2.5 text-sm font-arabic outline-none cursor-pointer"
          style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
        >
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

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
