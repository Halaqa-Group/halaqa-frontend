<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const {
  scheduleWithDates,
  isEditMode,
  planStatus,
  selectedCount,
  hasSelection,
  clipboard,
  selectedStudent,
  isSaving,
  isLoading,
  saveAsDraft,
  approvePlan,
  startEditing,
  cancelEditing,
  deleteSelectedRows,
  copySelectedRows,
  pasteRows,
  addDay,
  loadPlan,
  resetState
} = useSchedule()

const { students, fetchStudents } = useStudents()
const toast = useToast()

async function handleSaveAsDraft() {
  try {
    await saveAsDraft()
    toast.add({ title: 'تم حفظ الخطة كمسودة', icon: 'i-lucide-check-circle', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'خطأ في حفظ الخطة', description: e?.data?.message || e?.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

async function handleApprovePlan() {
  try {
    await approvePlan()
    toast.add({ title: 'تم اعتماد الخطة', icon: 'i-lucide-check-circle', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'خطأ في اعتماد الخطة', description: e?.data?.message || e?.message, icon: 'i-lucide-alert-circle', color: 'error' })
  }
}

const isStudentDropdownOpen = ref(false)
const studentDropdownRef = ref<HTMLElement | null>(null)
const studentSearch = ref('')
const selectedStudentObj = computed(() => students.value.find(s => s.name === selectedStudent.value))
const filteredDropdownStudents = computed(() =>
  studentSearch.value.trim()
    ? students.value.filter(s => s.name.includes(studentSearch.value.trim()))
    : students.value
)

function selectStudent(name: string) {
  selectedStudent.value = name
  isStudentDropdownOpen.value = false
  studentSearch.value = ''
}

function handleDocumentClick(e: MouseEvent) {
  if (studentDropdownRef.value && !studentDropdownRef.value.contains(e.target as Node)) {
    isStudentDropdownOpen.value = false
    studentSearch.value = ''
  }
}

watch(selectedStudent, async (newVal, oldVal) => {
  if (newVal !== oldVal) {
    resetState()
    await loadPlan()
  }
})

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  await fetchStudents()
  if (students.value[0] && !selectedStudent.value) {
    selectedStudent.value = students.value[0].name
    // watch fires on the assignment above and calls loadPlan
  } else if (selectedStudent.value) {
    // Already have a student (returning to page) — load their plan
    await loadPlan()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div class="space-y-1">
        <span class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-primary);">
          التخطيط الأسبوعي
        </span>
        <h2 class="display-lg" style="color: var(--color-on-surface);">مخطط الأسبوع</h2>
        <p class="text-sm" style="color: var(--color-on-surface-variant);">
          خطط دروس الأسبوع لكل طالب وتتبع التقدم في الحفظ والمراجعة.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">

        <!-- NEW: enter values, save as draft -->
        <template v-if="planStatus === 'new'">
          <UButton
            variant="outline" color="neutral"
            label="نسخ من الأسبوع الماضي" icon="i-lucide-copy"
            size="lg" class="font-bold rounded-full px-6"
          />
          <UButton
            color="primary" label="حفظ كمسودة" icon="i-lucide-save"
            size="lg" class="font-bold rounded-full px-6"
            :loading="isSaving" :disabled="isSaving"
            @click="handleSaveAsDraft"
          />
        </template>

        <!-- DRAFT, viewing -->
        <template v-else-if="planStatus === 'draft' && !isEditMode">
          <UButton
            variant="outline" color="neutral"
            label="تعديل الخطة" icon="i-lucide-pencil"
            size="lg" class="font-bold rounded-full px-6"
            @click="startEditing"
          />
          <UButton
            color="primary" label="اعتماد الخطة" icon="i-lucide-check-circle"
            size="lg" class="font-bold rounded-full px-6"
            :loading="isSaving" :disabled="isSaving"
            @click="handleApprovePlan"
          />
        </template>

        <!-- DRAFT, editing -->
        <template v-else-if="planStatus === 'draft' && isEditMode">
          <UButton
            variant="ghost" color="neutral"
            label="إلغاء" icon="i-lucide-x"
            size="lg" class="font-bold rounded-full px-6"
            :disabled="isSaving"
            @click="cancelEditing"
          />
          <UButton
            color="primary" label="حفظ كمسودة" icon="i-lucide-save"
            size="lg" class="font-bold rounded-full px-6"
            :loading="isSaving" :disabled="isSaving"
            @click="handleSaveAsDraft"
          />
        </template>

        <!-- APPROVED, viewing -->
        <template v-else-if="planStatus === 'approved' && !isEditMode">
          <div class="flex items-center gap-2 px-5 py-2.5 rounded-full border font-semibold text-sm"
            style="background-color: #E0F0EE; border-color: #4A8E85; color: #4A8E85;">
            <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
            معتمدة
          </div>
          <UButton
            variant="outline" color="neutral"
            label="تعديل الخطة" icon="i-lucide-pencil"
            size="lg" class="font-bold rounded-full px-6"
            @click="startEditing"
          />
        </template>

        <!-- APPROVED, editing -->
        <template v-else-if="planStatus === 'approved' && isEditMode">
          <UButton
            variant="ghost" color="neutral"
            label="إلغاء" icon="i-lucide-x"
            size="lg" class="font-bold rounded-full px-6"
            :disabled="isSaving"
            @click="cancelEditing"
          />
          <UButton
            color="primary" label="حفظ التعديلات" icon="i-lucide-save"
            size="lg" class="font-bold rounded-full px-6"
            :loading="isSaving" :disabled="isSaving"
            @click="handleSaveAsDraft"
          />
        </template>

      </div>
    </div>

    <!-- Two-column layout: sidebar (right in RTL) + table (left in RTL) -->
    <div class="flex gap-14 items-start w-full">

      <!-- RIGHT sidebar (first child = right in RTL) -->
      <div class="w-full lg:w-[320px] shrink-0 space-y-10 mt-8">

        <!-- Student selector card -->
        <div
          ref="studentDropdownRef"
          class="relative z-30 bg-primary text-on-primary p-5 rounded-[40px] flex flex-col gap-4 shadow-2xl shadow-primary/30 hover:scale-[1.01] transition-all border border-white/10"
        >
          <!-- Gradient overlays -->
          <div class="absolute inset-0 rounded-[40px] overflow-hidden pointer-events-none">
            <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <div class="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </div>

          <!-- Header row -->
          <div class="flex items-center justify-center px-2 relative z-10">
            <p class="text-sm font-semibold text-white">اختر طالباً</p>
          </div>

          <!-- Dropdown trigger -->
          <div class="relative z-20">
            <button
              class="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] p-2 flex items-center gap-3 hover:bg-white/20 transition-all group shadow-xl cursor-pointer"
              @click="isStudentDropdownOpen = !isStudentDropdownOpen"
            >
              <div class="w-11 h-11 rounded-[18px] overflow-hidden border-2 border-white/40 shadow-inner shrink-0 group-hover:rotate-1 transition-transform">
                <img
                  :src="selectedStudentObj?.avatar ?? `https://api.dicebear.com/9.x/notionists/svg?seed=default`"
                  :alt="selectedStudent ?? ''"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                >
              </div>
              <div class="flex-1 text-right">
                <h3 class="text-on-primary font-bold text-base tracking-tight leading-tight">
                  {{ selectedStudent || 'اختر طالباً' }}
                </h3>
              </div>
              <div class="ps-3 text-on-primary/30 group-hover:text-on-primary transition-colors">
                <UIcon
                  name="i-lucide-chevron-down"
                  class="w-4 h-4 transition-transform duration-300"
                  :class="{ 'rotate-180': isStudentDropdownOpen }"
                />
              </div>
            </button>

            <!-- Dropdown list -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-2"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-2"
            >
              <div
                v-if="isStudentDropdownOpen"
                class="absolute top-full mt-3 w-full bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden"
              >
                <!-- Search bar -->
                <div class="px-3 pt-3 pb-2">
                  <div class="flex items-center gap-2 bg-black/5 rounded-[14px] px-3 py-2">
                    <UIcon name="i-lucide-search" class="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                    <input
                      v-model="studentSearch"
                      type="text"
                      placeholder="بحث..."
                      class="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none text-right"
                      dir="rtl"
                    >
                  </div>
                </div>

                <div class="px-2 pb-2 flex flex-col gap-0.5 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <button
                    v-for="s in filteredDropdownStudents"
                    :key="s.id"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-[18px] transition-all"
                    :class="selectedStudent === s.name ? 'bg-primary' : 'hover:bg-primary/5 cursor-pointer'"
                    @click="selectStudent(s.name)"
                  >
                    <!-- Avatar (first child = rightmost in RTL) -->
                    <div
                      class="w-10 h-10 rounded-[14px] overflow-hidden border-2 shrink-0"
                      :class="selectedStudent === s.name ? 'border-white/30' : 'border-primary/15'"
                    >
                      <img :src="s.avatar" :alt="s.name" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                    </div>

                    <!-- Name + halaqa subtitle -->
                    <div class="flex-1 text-right">
                      <p
                        class="font-bold text-sm leading-tight"
                        :class="selectedStudent === s.name ? 'text-on-primary' : 'text-on-surface'"
                      >{{ s.name }}</p>
                      <p
                        v-if="s.halaqa && s.halaqa !== '—'"
                        class="text-[11px] mt-0.5"
                        :class="selectedStudent === s.name ? 'text-on-primary/60' : 'text-on-surface-variant'"
                      >{{ s.halaqa }}</p>
                    </div>

                    <!-- Checkmark / spacer (last child = leftmost in RTL) -->
                    <UIcon
                      v-if="selectedStudent === s.name"
                      name="i-lucide-check"
                      class="w-4 h-4 text-on-primary/70 shrink-0"
                    />
                    <span v-else class="w-4 shrink-0" />
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Calendar -->
        <div class="flex flex-col gap-3 mt-6">
          <p class="text-sm font-semibold text-center" style="color: var(--color-on-surface-variant);">اختر أسبوعًا</p>
          <PlannerCalendar />
        </div>
      </div>

      <!-- LEFT table (second child = left in RTL) -->
      <div class="flex-1 min-w-0 flex flex-col gap-4">

        <!-- Column headers -->
        <div class="flex items-center gap-4 px-4">
          <div v-if="isEditMode" class="w-8 shrink-0 flex items-center justify-center">
            <span class="text-xs text-muted whitespace-nowrap">تحديد الكل</span>
          </div>
          <div class="w-[110px] shrink-0" />
          <div class="flex-1 flex gap-6">
            <div class="flex-[4] flex justify-center">
              <span class="text-xs font-medium text-muted">الحفظ الجديد</span>
            </div>
            <div class="flex-[4] flex justify-center">
              <span class="text-xs font-medium text-muted">المراجعة القريبة</span>
            </div>
            <div class="flex-[4] flex justify-center">
              <span class="text-xs font-medium text-muted">المراجعة البعيدة</span>
            </div>
          </div>
        </div>

        <!-- Batch action bar -->
        <Transition name="slide-down">
          <div
            v-if="isEditMode && hasSelection"
            class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-elevated border border-default"
          >
            <span class="text-sm text-muted">{{ selectedCount }} أيام محددة</span>
            <div class="flex gap-2 ms-auto">
              <UButton variant="soft" color="neutral" icon="i-lucide-copy" label="نسخ" size="sm" @click="copySelectedRows" />
              <UButton variant="soft" color="error" icon="i-lucide-trash-2" label="حذف" size="sm" @click="deleteSelectedRows" />
              <UButton
                v-if="clipboard.length > 0"
                variant="soft"
                color="primary"
                icon="i-lucide-clipboard"
                :label="`لصق (${clipboard.length})`"
                size="sm"
                @click="pasteRows"
              />
            </div>
          </div>
        </Transition>

        <!-- Day rows -->
        <div class="flex flex-col gap-5">
          <PlannerDayRow
            v-for="day in scheduleWithDates"
            :key="day.id"
            :data="day"
          />
        </div>

      </div>
    </div>
  </div>
</template>


<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
