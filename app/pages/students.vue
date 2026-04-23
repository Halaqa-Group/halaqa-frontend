<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { students, searchQuery, openAdd } = useStudents()

const filterHalaqa = ref('')
const filterStatus = ref('')

const filteredStudents = computed(() =>
  students.value.filter(s => {
    const matchSearch = !searchQuery.value || s.name.includes(searchQuery.value) || s.currentSurah.includes(searchQuery.value)
    const matchHalaqa = !filterHalaqa.value || s.halaqa === filterHalaqa.value
    const matchStatus = !filterStatus.value || s.status === filterStatus.value
    return matchSearch && matchHalaqa && matchStatus
  })
)

const halaqaOptions = [
  { label: 'مجموعة الحلقة', value: '' },
  { label: 'شمس الضحى', value: 'شمس الضحى' },
  { label: 'نسيم الظهيرة', value: 'نسيم الظهيرة' },
  { label: 'ندى المساء', value: 'ندى المساء' }
]

const statusOptions = [
  { label: 'الحالة', value: '' },
  { label: 'نشط', value: 'active' },
  { label: 'غير نشط', value: 'inactive' }
]

const loadProgress = computed(() =>
  Math.round((filteredStudents.value.length / Math.max(students.value.length, 1)) * 100)
)
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
        style="background-color: #804c7d; color: white;"
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
          placeholder="ابحث بالاسم، السورة أو المعرف..."
          class="w-full pr-12 pl-4 py-2.5 rounded-xl text-sm font-arabic outline-none transition-all"
          style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
        >
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <select
          v-model="filterHalaqa"
          class="rounded-xl px-4 py-2.5 text-sm font-arabic outline-none cursor-pointer"
          style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
        >
          <option v-for="opt in halaqaOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <select
          class="rounded-xl px-4 py-2.5 text-sm font-arabic outline-none cursor-pointer"
          style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
        >
          <option>المستوى</option>
          <option>متوسط</option>
          <option>متقدم</option>
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

    <!-- Student grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StudentStudentCard
        v-for="student in filteredStudents"
        :key="student.id"
        :student="student"
      />
    </div>

    <!-- Load more / pagination -->
    <div class="mt-12 text-center py-16">
      <div class="flex flex-col items-center gap-6">
        <div class="flex flex-col items-center gap-2">
          <p class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
            عرض {{ filteredStudents.length }} من {{ students.length }} طالباً
          </p>
          <div class="w-48 h-1.5 rounded-full overflow-hidden" style="background-color: #f3e8f2;">
            <div
              class="h-full rounded-full transition-all"
              style="background-color: #804c7d;"
              :style="{ width: `${loadProgress}%` }"
            />
          </div>
        </div>

        <button
          class="inline-flex items-center justify-center px-8 py-3 rounded-full text-sm font-arabic font-bold transition-all hover:opacity-80 active:scale-95"
          style="background-color: white; border: 1px solid #804c7d; color: #804c7d;"
        >
          تحميل المزيد من الطلاب
        </button>

        <p
          class="text-[10px] uppercase font-bold tracking-widest font-arabic animate-pulse"
          style="color: var(--color-outline);"
        >
          مرر لاستكشاف المزيد
        </p>
      </div>
    </div>
  </div>

  <StudentViewStudentModal />
  <StudentAddStudentModal />
</template>
