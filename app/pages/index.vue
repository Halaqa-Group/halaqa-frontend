<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const api = useApi()
const { user } = useAuth()
const { halaqat, fetchHalaqat } = useHalaqat()
const { students, fetchStudents } = useStudents()

const todayAttendance = ref<any[]>([])
const isLoading = ref(true)

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

onMounted(async () => {
  try {
    await Promise.all([fetchHalaqat(), fetchStudents()])
    if (halaqat.value.length > 0) {
      todayAttendance.value = await api<any[]>(
        `/attendance?halaqaId=${halaqat.value[0].id}&date=${today}`
      )
    }
  }
  finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Welcome header -->
    <div class="space-y-1">
      <p class="label-md font-arabic" style="color: var(--color-on-surface-variant);">{{ formattedToday }}</p>
      <h2 class="display-lg font-arabic" style="color: var(--color-on-surface);">
        أهلاً، {{ user?.name || 'مرحباً بك' }}
      </h2>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
    </div>

    <template v-else>
      <!-- Stats row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Total students -->
        <div class="rounded-2xl p-5" style="background-color: white; border: 1px solid #F0F0F0;">
          <div class="flex items-center justify-between mb-3">
            <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">الطلاب</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background-color: var(--color-primary-container);">
              <UIcon name="i-lucide-users" class="w-4 h-4" style="color: var(--color-primary);" />
            </div>
          </div>
          <p class="display-md font-bold" style="color: var(--color-on-surface);">{{ students.length }}</p>
          <p class="label-sm font-arabic mt-1" style="color: var(--color-on-surface-variant);">إجمالي المسجلين</p>
        </div>

        <!-- Halaqat -->
        <div class="rounded-2xl p-5" style="background-color: white; border: 1px solid #F0F0F0;">
          <div class="flex items-center justify-between mb-3">
            <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">الحلقات</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background-color: #E0F0EE;">
              <UIcon name="i-lucide-layout-grid" class="w-4 h-4" style="color: var(--color-secondary);" />
            </div>
          </div>
          <p class="display-md font-bold" style="color: var(--color-on-surface);">{{ halaqat.length }}</p>
          <p class="label-sm font-arabic mt-1" style="color: var(--color-on-surface-variant);">حلقات نشطة</p>
        </div>

        <!-- Today attendance rate -->
        <div class="rounded-2xl p-5" style="background-color: white; border: 1px solid #F0F0F0;">
          <div class="flex items-center justify-between mb-3">
            <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">الحضور اليوم</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background-color: #FCE4EC;">
              <UIcon name="i-lucide-user-check" class="w-4 h-4" style="color: #D81B60;" />
            </div>
          </div>
          <p class="display-md font-bold" style="color: var(--color-on-surface);">
            {{ todayAttendance.length > 0 ? `${attendanceRate}%` : '—' }}
          </p>
          <p class="label-sm font-arabic mt-1" style="color: var(--color-on-surface-variant);">
            {{ todayAttendance.length > 0 ? `${presentToday} من ${todayAttendance.length}` : 'لم يُسجَّل بعد' }}
          </p>
        </div>

        <!-- Role badge -->
        <div class="rounded-2xl p-5" style="background-color: var(--color-primary-container); border: 1px solid transparent;">
          <div class="flex items-center justify-between mb-3">
            <span class="label-md font-arabic" style="color: var(--color-primary);">الدور</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background-color: var(--color-primary);">
              <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-white" />
            </div>
          </div>
          <p class="body-lg font-arabic font-bold" style="color: var(--color-primary);">
            {{ user?.role === 'teacher' ? 'معلم' : user?.role === 'admin' ? 'مدير' : 'ولي أمر' }}
          </p>
          <p class="label-sm font-arabic mt-1" style="color: var(--color-primary);">{{ user?.email }}</p>
        </div>
      </div>

      <!-- Halaqat list -->
      <div v-if="halaqat.length > 0">
        <h3 class="body-lg font-arabic font-semibold mb-4" style="color: var(--color-on-surface);">حلقاتي</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="h in halaqat"
            :key="h.id"
            class="rounded-2xl p-5 flex items-center gap-4"
            style="background-color: white; border: 1px solid #F0F0F0;"
          >
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style="background-color: var(--color-primary-container);">
              <UIcon name="i-lucide-book-open" class="w-5 h-5" style="color: var(--color-primary);" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="body-md font-arabic font-semibold truncate" style="color: var(--color-on-surface);">{{ h.name }}</p>
              <p class="label-sm font-arabic" style="color: var(--color-on-surface-variant);">
                {{ h.type === 'Memorization' ? 'حفظ' : h.type === 'Tajweed' ? 'تجويد' : 'عقيدة' }}
              </p>
            </div>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-arrow-left"
              size="xs"
              @click="navigateTo('/attendance')"
            />
          </div>
        </div>
      </div>

      <!-- Empty state for new users -->
      <div
        v-if="halaqat.length === 0 && students.length === 0"
        class="flex flex-col items-center gap-4 py-16 rounded-2xl"
        style="background-color: var(--color-surface-container-lowest);"
      >
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background-color: var(--color-primary-container);">
          <UIcon name="i-lucide-book-open-text" class="w-8 h-8" style="color: var(--color-primary);" />
        </div>
        <h3 class="body-lg font-arabic font-semibold" style="color: var(--color-on-surface);">مرحباً بك في حلقة</h3>
        <p class="body-sm font-arabic text-center max-w-xs" style="color: var(--color-on-surface-variant);">
          لم يتم إعداد الحلقات بعد. تواصل مع المشرف لإضافة حلقاتك.
        </p>
      </div>
    </template>
  </div>
</template>
