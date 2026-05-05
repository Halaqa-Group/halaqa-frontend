<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const { students, searchQuery, isLoading, error, fetchStudents, openAdd } = useStudents()
const { selectedHalaqaId } = useGlobalHalaqa()

type SortKey = 'newest' | 'topMemorizers' | 'lowestAttendance' | 'nameAsc'
type ViewMode = 'grid' | 'list'

const filterStatus = ref<string | null>(null)
const sortKey = ref<SortKey>('newest')
const viewMode = ref<ViewMode>('grid')
const visibleCount = ref(12)

const studentsWithMeta = computed(() =>
  students.value.map(s => ({ student: s, meta: getStudentMockMeta(s) }))
)

const searchFiltered = computed(() =>
  studentsWithMeta.value.filter(({ student }) =>
    !searchQuery.value || student.name.includes(searchQuery.value)
  )
)

const filteredStudents = computed(() =>
  searchFiltered.value.filter(({ student }) =>
    filterStatus.value === null || student.status === filterStatus.value
  )
)

const sortedStudents = computed(() => {
  const arr = [...filteredStudents.value]
  switch (sortKey.value) {
    case 'topMemorizers':
      return arr.sort((a, b) => b.meta.progress - a.meta.progress)
    case 'lowestAttendance':
      return arr.sort((a, b) => a.meta.attendanceRate - b.meta.attendanceRate)
    case 'nameAsc':
      return arr.sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'))
    case 'newest':
    default:
      return arr
  }
})

const visibleStudents = computed(() => sortedStudents.value.slice(0, visibleCount.value))

watch([searchQuery, filterStatus, sortKey], () => {
  visibleCount.value = 12
})

const filterCounts = computed(() => {
  const all = searchFiltered.value.length
  const active = searchFiltered.value.filter(s => s.student.status === 'active').length
  const inactive = searchFiltered.value.filter(s => s.student.status === 'inactive').length
  return { all, active, inactive }
})

const statusFilters = computed<{ label: string, value: string | null, count: number }[]>(() => [
  { label: t('pages.students.statusAll'), value: null, count: filterCounts.value.all },
  { label: t('pages.students.statusActive'), value: 'active', count: filterCounts.value.active },
  { label: t('pages.students.statusInactive'), value: 'inactive', count: filterCounts.value.inactive }
])

// Page-level summary stats (across all students, before search/filter)
const summary = computed(() => {
  const total = students.value.length
  const active = students.value.filter(s => s.status === 'active').length
  const inactive = total - active
  const metas = studentsWithMeta.value.map(s => s.meta)
  const avgProgress = metas.length
    ? Math.round(metas.reduce((sum, m) => sum + m.progress, 0) / metas.length)
    : 0
  const avgAttendance = metas.length
    ? Math.round(metas.reduce((sum, m) => sum + m.attendanceRate, 0) / metas.length)
    : 0
  return { total, active, inactive, avgProgress, avgAttendance }
})

const sortItems = computed<DropdownMenuItem[][]>(() => [[
  { label: t('pages.students.sort.newest'), icon: 'i-lucide-clock', onSelect: () => { sortKey.value = 'newest' } },
  { label: t('pages.students.sort.topMemorizers'), icon: 'i-lucide-trending-up', onSelect: () => { sortKey.value = 'topMemorizers' } },
  { label: t('pages.students.sort.lowestAttendance'), icon: 'i-lucide-trending-down', onSelect: () => { sortKey.value = 'lowestAttendance' } },
  { label: t('pages.students.sort.nameAsc'), icon: 'i-lucide-arrow-down-a-z', onSelect: () => { sortKey.value = 'nameAsc' } }
]])

const sortLabel = computed(() => t(`pages.students.sort.${sortKey.value}`))

function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = null
}

const loadProgress = computed(() =>
  Math.round((sortedStudents.value.length / Math.max(students.value.length, 1)) * 100)
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
    <!-- Screen header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest text-primary">
          {{ $t('pages.students.communityRecord') }}
        </span>
        <h2 class="display-lg text-on-surface">
          {{ $t('pages.students.title') }}
        </h2>
        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.students.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- View toggle -->
        <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
          <UButton
            variant="ghost"
            color="primary"
            icon="i-lucide-layout-grid"
            size="md"
            class="rounded-full px-3"
            :class="viewMode === 'grid' ? 'bg-primary-container text-primary font-semibold' : 'text-muted'"
            :aria-label="$t('pages.students.view.grid')"
            @click="viewMode = 'grid'"
          />
          <UButton
            variant="ghost"
            color="primary"
            icon="i-lucide-list"
            size="md"
            class="rounded-full px-3"
            :class="viewMode === 'list' ? 'bg-primary-container text-primary font-semibold' : 'text-muted'"
            :aria-label="$t('pages.students.view.list')"
            @click="viewMode = 'list'"
          />
        </div>

        <UButton
          icon="i-lucide-plus"
          size="lg"
          class="font-bold rounded-full shrink-0 px-6"
          @click="openAdd"
        >
          {{ $t('pages.students.addNew') }}
        </UButton>
      </div>
    </div>

    <!-- Summary stat pills -->
    <div v-if="!isLoading && students.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      <div class="bg-white border border-outline-variant rounded-2xl px-4 py-3 flex flex-col gap-1">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.stats.totalStudents') }}
        </span>
        <span class="text-2xl font-bold text-on-surface">{{ summary.total }}</span>
      </div>
      <div class="rounded-2xl px-4 py-3 flex flex-col gap-1 bg-track-hifz-bg border border-track-hifz/20">
        <span class="text-xs text-track-hifz">
          {{ $t('pages.students.stats.activeStudents') }}
        </span>
        <span class="text-2xl font-bold text-track-hifz">{{ summary.active }}</span>
      </div>
      <div class="rounded-2xl px-4 py-3 flex flex-col gap-1 bg-gray-100 border border-gray-200">
        <span class="text-xs text-gray-500">
          {{ $t('pages.students.stats.inactiveStudents') }}
        </span>
        <span class="text-2xl font-bold text-gray-600">{{ summary.inactive }}</span>
      </div>
      <div class="bg-white border border-outline-variant rounded-2xl px-4 py-3 flex flex-col gap-1">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.stats.avgMemorization') }}
        </span>
        <span class="text-2xl font-bold text-primary">{{ summary.avgProgress }}%</span>
      </div>
      <div class="bg-white border border-outline-variant rounded-2xl px-4 py-3 flex flex-col gap-1 col-span-2 md:col-span-1">
        <span class="text-xs text-on-surface-variant">
          {{ $t('pages.students.stats.weeklyAttendance') }}
        </span>
        <span class="text-2xl font-bold text-primary">{{ summary.avgAttendance }}%</span>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-4 mb-8">
      <!-- Search -->
      <UInput
        v-model="searchQuery"
        type="text"
        :placeholder="$t('pages.students.searchByName')"
        trailing-icon="i-lucide-search"
        variant="none"
        class="flex-1 min-w-72"
        :ui="{
          base: 'w-full pe-11 ps-4 py-3 rounded-2xl text-base bg-surface-container-lowest text-on-surface border-[1.5px] border-outline-variant focus:ring-2 focus:ring-primary/30',
          trailing: 'absolute inset-y-0 end-4',
          trailingIcon: 'w-4 h-4 text-on-surface-variant'
        }"
      />

      <!-- Status pill toggle -->
      <div class="flex items-center bg-elevated p-1 rounded-full border border-default">
        <UButton
          v-for="f in statusFilters"
          :key="String(f.value)"
          variant="ghost"
          color="primary"
          class="px-5 py-1.5 text-base rounded-full"
          :class="filterStatus === f.value
            ? 'bg-primary-container text-primary font-semibold'
            : 'text-muted hover:bg-primary/8 hover:text-primary'"
          @click="filterStatus = f.value"
        >
          {{ f.label }}
          <span
            class="ms-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold"
            :class="filterStatus === f.value
              ? 'bg-primary text-white'
              : 'bg-black/5 text-on-surface-variant'"
          >{{ f.count }}</span>
        </UButton>
      </div>

      <!-- Sort dropdown -->
      <UDropdownMenu
        :items="sortItems"
        :content="{ align: 'end', collisionPadding: 12 }"
        :ui="{ content: 'w-56' }"
      >
        <UButton
          variant="outline"
          color="neutral"
          trailing-icon="i-lucide-chevron-down"
          icon="i-lucide-arrow-up-down"
          size="md"
          class="rounded-full px-4"
        >
          {{ $t('pages.students.sort.label') }}: {{ sortLabel }}
        </UButton>
      </UDropdownMenu>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin text-primary" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl p-6 text-center bg-status-conflict-bg">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 text-status-conflict" />
      <p class="text-status-conflict">
        {{ error }}
      </p>
    </div>

    <!-- Welcome empty state (zero students) -->
    <div
      v-else-if="students.length === 0"
      class="flex flex-col items-center justify-center gap-5 py-20 rounded-2xl border border-dashed border-outline-variant"
    >
      <div class="w-20 h-20 rounded-full flex items-center justify-center bg-primary-container">
        <UIcon name="i-lucide-user-plus" class="w-10 h-10 text-primary" />
      </div>
      <p class="text-lg font-semibold text-on-surface">
        {{ $t('pages.students.empty.welcomeTitle') }}
      </p>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        class="font-bold rounded-full px-6"
        @click="openAdd"
      >
        {{ $t('pages.students.addNew') }}
      </UButton>
    </div>

    <!-- No-match empty state (filters applied) -->
    <div
      v-else-if="sortedStudents.length === 0"
      class="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border border-dashed border-outline-variant"
    >
      <div class="w-16 h-16 rounded-full flex items-center justify-center bg-primary-container">
        <UIcon name="i-lucide-search-x" class="w-8 h-8 text-primary" />
      </div>
      <p class="text-on-surface">
        {{ $t('pages.students.empty.noMatchTitle') }}
      </p>
      <UButton
        variant="soft"
        color="primary"
        icon="i-lucide-x"
        size="md"
        class="rounded-full"
        @click="clearFilters"
      >
        {{ $t('pages.students.empty.clearFilters') }}
      </UButton>
    </div>

    <!-- Grid view -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StudentCard
        v-for="{ student } in visibleStudents"
        :key="student.id"
        :student="student"
      />
    </div>

    <!-- List view -->
    <div v-else class="flex flex-col gap-2">
      <StudentRow
        v-for="{ student } in visibleStudents"
        :key="student.id"
        :student="student"
      />
    </div>

    <!-- Load more -->
    <div v-if="!isLoading && sortedStudents.length > visibleCount" class="flex justify-center mt-8">
      <UButton
        variant="outline"
        color="primary"
        size="md"
        class="rounded-full px-6"
        @click="visibleCount += 12"
      >
        {{ $t('pages.students.loadMore') }}
      </UButton>
    </div>

    <!-- Progress / count footer -->
    <div v-if="!isLoading && students.length > 0 && sortedStudents.length > 0" class="mt-12 text-center py-8">
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-on-surface-variant">
          {{ $t('pages.students.showingCount', { filtered: sortedStudents.length, total: students.length }) }}
        </p>
        <div class="w-48 h-1.5 rounded-full overflow-hidden bg-primary-container">
          <div
            class="h-full rounded-full transition-all duration-200 bg-primary"
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
