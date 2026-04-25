<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const api = useApi()
const { user } = useAuth()
const { selectedHalaqaId, halaqat, initializeHalaqa } = useGlobalHalaqa()
const { students, fetchStudents } = useStudents()

const todayAttendance = ref<any[]>([])
const isLoading = ref(true)
const attendanceError = ref(false)

const today = new Date().toISOString().split('T')[0]

const presentToday = computed(() =>
  todayAttendance.value.filter(a => a.status === 'Present').length
)

const attendanceRate = computed(() =>
  todayAttendance.value.length > 0
    ? Math.round((presentToday.value / todayAttendance.value.length) * 100)
    : 0
)

const formattedToday = computed(() =>
  new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)

const quickActions = [
  {
    label: 'الحضور',
    description: 'تسجيل الحضور اليومي',
    icon: 'i-lucide-clipboard-check',
    href: '/attendance',
    color: 'var(--color-track-hifz)',
    bg: 'var(--color-track-hifz-bg)',
  },
  {
    label: 'الطلاب',
    description: 'إدارة المتعلمين',
    icon: 'i-lucide-users',
    href: '/students',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-container)',
  },
  {
    label: 'الإنجازات',
    description: 'متابعة التلاوة والحفظ',
    icon: 'i-lucide-star',
    href: '/achievements',
    color: 'var(--color-status-warning)',
    bg: 'var(--color-status-warning-bg)',
  },
  {
    label: 'التحليلات',
    description: 'تقارير الأداء والتنبيهات',
    icon: 'i-lucide-bar-chart-3',
    href: '/analytics',
    color: 'var(--color-status-overdue)',
    bg: 'var(--color-status-overdue-bg)',
  },
]

async function loadDashboard(halaqaId: number) {
  isLoading.value = true
  attendanceError.value = false
  try {
    await fetchStudents(halaqaId)
    try {
      todayAttendance.value = await api<any[]>(`/attendance?halaqaId=${halaqaId}&date=${today}`)
    }
    catch {
      attendanceError.value = true
    }
  }
  finally {
    isLoading.value = false
  }
}

watch(selectedHalaqaId, async (newId) => {
  if (newId) await loadDashboard(newId)
})

onMounted(async () => {
  await initializeHalaqa()
  if (selectedHalaqaId.value) {
    await loadDashboard(selectedHalaqaId.value)
  }
  else {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <span class="text-xs font-arabic font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          {{ formattedToday }}
        </span>
        <h2 class="display-lg font-arabic" style="color: var(--color-on-surface);">
          أهلاً، {{ user?.name || 'مرحباً بك' }}
        </h2>
        <p class="text-sm font-arabic" style="color: var(--color-on-surface-variant);">
          هذه نظرة عامة على نشاط حلقتك اليوم.
        </p>
      </div>
      <div
        class="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0"
        style="background-color: var(--color-primary-container);"
      >
        <UIcon name="i-lucide-shield-check" class="w-4 h-4" style="color: var(--color-primary);" />
        <span class="text-sm font-arabic font-semibold" style="color: var(--color-primary);">
          {{ user?.role === 'teacher' ? 'معلم' : user?.role === 'admin' ? 'مدير' : 'ولي أمر' }}
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
    </div>

    <template v-else>
      <!-- Stats row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          class="rounded-[40px] p-6 flex flex-col gap-5"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 4px 20px rgba(128,76,125,0.08);"
        >
          <div class="w-12 h-12 rounded-[18px] flex items-center justify-center" style="background-color: var(--color-primary-container);">
            <UIcon name="i-lucide-users" class="w-6 h-6" style="color: var(--color-primary);" />
          </div>
          <div>
            <p class="font-arabic font-bold" style="font-size: 36px; line-height: 1; color: var(--color-on-surface);">{{ students.length }}</p>
            <p class="font-arabic font-semibold mt-2" style="font-size: 15px; color: var(--color-on-surface-variant);">إجمالي الطلاب</p>
          </div>
        </div>

        <div
          class="rounded-[40px] p-6 flex flex-col gap-5"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 4px 20px rgba(128,76,125,0.08);"
        >
          <div class="w-12 h-12 rounded-[18px] flex items-center justify-center" style="background-color: var(--color-track-hifz-bg);">
            <UIcon name="i-lucide-layout-grid" class="w-6 h-6" style="color: var(--color-secondary);" />
          </div>
          <div>
            <p class="font-bold" style="font-size: 36px; line-height: 1; color: var(--color-on-surface);">{{ halaqat.length }}</p>
            <p class="font-arabic font-semibold mt-2" style="font-size: 15px; color: var(--color-on-surface-variant);">حلقات نشطة</p>
          </div>
        </div>

        <div
          class="rounded-[40px] p-6 flex flex-col gap-5"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 4px 20px rgba(128,76,125,0.08);"
        >
          <div class="w-12 h-12 rounded-[18px] flex items-center justify-center" style="background-color: var(--color-status-conflict-bg);">
            <UIcon name="i-lucide-user-check" class="w-6 h-6" style="color: var(--color-status-conflict);" />
          </div>
          <div>
            <p class="font-bold" style="font-size: 36px; line-height: 1; color: var(--color-on-surface);">
              {{ attendanceError ? '—' : todayAttendance.length > 0 ? `${attendanceRate}%` : '—' }}
            </p>
            <p class="font-arabic font-semibold mt-2" style="font-size: 15px; color: var(--color-on-surface-variant);">
              {{ attendanceError ? 'تعذّر التحميل' : todayAttendance.length > 0 ? `${presentToday} من ${todayAttendance.length}` : 'الحضور اليوم' }}
            </p>
          </div>
        </div>

        <div
          class="rounded-[40px] p-6 flex flex-col gap-5"
          style="background-color: var(--color-surface-container-lowest); box-shadow: 0 4px 20px rgba(128,76,125,0.08);"
        >
          <div class="w-12 h-12 rounded-[18px] flex items-center justify-center" style="background-color: var(--color-status-ok-bg);">
            <UIcon name="i-lucide-calendar-check" class="w-6 h-6" style="color: var(--color-status-ok);" />
          </div>
          <div>
            <p class="font-arabic font-bold" style="font-size: 28px; line-height: 1.2; color: var(--color-on-surface);">
              {{ new Date().toLocaleDateString('ar-SA', { weekday: 'long' }) }}
            </p>
            <p class="font-arabic font-semibold mt-2" style="font-size: 15px; color: var(--color-on-surface-variant);">اليوم الحالي</p>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <h3 class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">الوصول السريع</h3>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            v-for="action in quickActions"
            :key="action.href"
            class="rounded-2xl p-5 text-start flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer"
            style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-card-border); box-shadow: var(--shadow-card);"
            @click="navigateTo(action.href)"
          >
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :style="`background-color: ${action.bg};`"
            >
              <UIcon :name="action.icon" class="w-5 h-5" :style="`color: ${action.color};`" />
            </div>
            <div>
              <p class="body-md font-arabic font-semibold" style="color: var(--color-on-surface);">{{ action.label }}</p>
              <p class="label-sm font-arabic mt-0.5" style="color: var(--color-on-surface-variant);">{{ action.description }}</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Empty state for new users -->
      <div
        v-if="students.length === 0"
        class="flex flex-col items-center gap-4 py-16 rounded-2xl"
        style="background-color: var(--color-surface-container-lowest); border: 1px solid var(--color-card-border);"
      >
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background-color: var(--color-primary-container);">
          <UIcon name="i-lucide-book-open-text" class="w-8 h-8" style="color: var(--color-primary);" />
        </div>
        <h3 class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">مرحباً بك في حلقة</h3>
        <p class="body-sm font-arabic text-center max-w-xs" style="color: var(--color-on-surface-variant);">
          لم يتم إعداد الحلقة بعد. تواصل مع المشرف لإضافة الطلاب.
        </p>
      </div>
    </template>
  </div>
</template>
