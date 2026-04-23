<script setup lang="ts">
const { isAddModalOpen, closeAdd } = useStudents()

const form = reactive({
  name: '',
  dob: '',
  joinDate: '',
  fatherName: '',
  motherName: '',
  fatherEmail: '',
  motherEmail: '',
  memPages: 0,
  nearPages: 0,
  farPages: 0,
  notes: ''
})

function handleSubmit() {
  closeAdd()
}
</script>

<template>
  <UModal
    v-model:open="isAddModalOpen"
    :ui="{ content: 'sm:max-w-4xl overflow-hidden' }"
    @close="closeAdd"
  >
    <template #content>
      <div class="flex flex-col" style="max-height: 90vh;" dir="rtl">

        <!-- Header (fixed) -->
        <div
          class="flex justify-between items-center px-8 py-6 shrink-0 border-b"
          style="border-color: rgba(209, 194, 204, 0.3);"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style="background-color: rgba(128, 76, 125, 0.1);"
            >
              <UIcon name="i-lucide-user-plus" class="w-5 h-5" style="color: #804c7d;" />
            </div>
            <div>
              <h3 class="text-xl font-bold font-arabic" style="color: var(--color-primary);">إضافة طالب جديد</h3>
              <p class="text-xs font-arabic" style="color: var(--color-on-surface-variant);">أدخل بيانات الطالب للبدء في تتبع التقدم التعليمي</p>
            </div>
          </div>
          <button
            class="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
            @click="closeAdd"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" style="color: var(--color-outline);" />
          </button>
        </div>

        <!-- Scrollable form body -->
        <form
          class="flex-1 overflow-y-auto px-8 py-8 space-y-10"
          @submit.prevent="handleSubmit"
        >
          <!-- Section: Photo upload + basic info -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Photo upload zone -->
            <div
              class="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all group hover:border-[#804c7d]/50"
              style="border-color: rgba(209, 194, 204, 0.5); background-color: #fbf1f6;"
            >
              <div class="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 overflow-hidden">
                <UIcon
                  name="i-lucide-camera"
                  class="w-10 h-10 transition-colors group-hover:text-[#804c7d]"
                  style="color: var(--color-outline-variant);"
                />
              </div>
              <p class="text-xs font-arabic font-semibold uppercase tracking-wide" style="color: var(--color-on-surface-variant);">رفع صورة الطالب</p>
              <p class="text-[10px] mt-1" style="color: var(--color-outline);">PNG, JPG حتى 5MB</p>
            </div>

            <!-- Basic info grid -->
            <div class="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">الاسم الكامل</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="اسم الطالب الرباعي"
                  class="form-input w-full px-4 py-3 rounded-xl text-sm font-arabic outline-none"
                  style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                >
              </div>
              <div>
                <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">تاريخ الميلاد</label>
                <input
                  v-model="form.dob"
                  type="date"
                  class="form-input w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                >
              </div>
              <div>
                <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">تاريخ الانضمام</label>
                <input
                  v-model="form.joinDate"
                  type="date"
                  class="form-input w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                >
              </div>
            </div>
          </div>

          <!-- Section: Parent info -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-r-4 pr-3" style="border-color: #804c7d;">
              <h4 class="font-arabic font-bold text-base" style="color: var(--color-primary);">معلومات ولي الأمر</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <!-- Father column -->
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">اسم الأب</label>
                  <input
                    v-model="form.fatherName"
                    type="text"
                    class="form-input w-full px-4 py-3 rounded-xl text-sm font-arabic outline-none"
                    style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                  >
                </div>
                <div>
                  <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">بريد الأب الإلكتروني</label>
                  <input
                    v-model="form.fatherEmail"
                    type="email"
                    dir="ltr"
                    class="form-input w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                    style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                  >
                </div>
              </div>
              <!-- Mother column -->
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">اسم الأم</label>
                  <input
                    v-model="form.motherName"
                    type="text"
                    class="form-input w-full px-4 py-3 rounded-xl text-sm font-arabic outline-none"
                    style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                  >
                </div>
                <div>
                  <label class="block text-xs font-arabic font-semibold uppercase tracking-wide mb-2" style="color: var(--color-on-surface-variant);">بريد الأم الإلكتروني</label>
                  <input
                    v-model="form.motherEmail"
                    type="email"
                    dir="ltr"
                    class="form-input w-full px-4 py-3 rounded-xl text-sm text-right outline-none"
                    style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Academic metrics -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-r-4 pr-3" style="border-color: var(--color-secondary);">
              <h4 class="font-arabic font-bold text-base" style="color: var(--color-secondary);">مقاييس الأداء اليومي</h4>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <!-- New memorization -->
              <div
                class="p-5 rounded-2xl"
                style="background-color: white; border: 1px solid rgba(209, 194, 204, 0.2);"
              >
                <label class="flex items-center gap-2 text-xs font-arabic font-semibold uppercase tracking-wide mb-3" style="color: var(--color-on-surface-variant);">
                  <UIcon name="i-lucide-book-open" class="w-4 h-4 shrink-0" style="color: var(--color-secondary);" />
                  صفحات الحفظ الجديد
                </label>
                <input
                  v-model.number="form.memPages"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="form-input w-full px-4 py-3 rounded-xl text-lg font-bold text-center outline-none"
                  style="background-color: #f9f9f9; color: #804c7d; border: none;"
                >
              </div>
              <!-- Near review -->
              <div
                class="p-5 rounded-2xl"
                style="background-color: white; border: 1px solid rgba(209, 194, 204, 0.2);"
              >
                <label class="flex items-center gap-2 text-xs font-arabic font-semibold uppercase tracking-wide mb-3" style="color: var(--color-on-surface-variant);">
                  <UIcon name="i-lucide-history" class="w-4 h-4 shrink-0" style="color: var(--color-secondary);" />
                  صفحات المراجعة القريبة
                </label>
                <input
                  v-model.number="form.nearPages"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="form-input w-full px-4 py-3 rounded-xl text-lg font-bold text-center outline-none"
                  style="background-color: #f9f9f9; color: #804c7d; border: none;"
                >
              </div>
              <!-- Far review -->
              <div
                class="p-5 rounded-2xl"
                style="background-color: white; border: 1px solid rgba(209, 194, 204, 0.2);"
              >
                <label class="flex items-center gap-2 text-xs font-arabic font-semibold uppercase tracking-wide mb-3" style="color: var(--color-on-surface-variant);">
                  <UIcon name="i-lucide-repeat" class="w-4 h-4 shrink-0" style="color: var(--color-secondary);" />
                  صفحات المراجعة البعيدة
                </label>
                <input
                  v-model.number="form.farPages"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="form-input w-full px-4 py-3 rounded-xl text-lg font-bold text-center outline-none"
                  style="background-color: #f9f9f9; color: #804c7d; border: none;"
                >
              </div>
            </div>
          </div>

          <!-- Section: Notes -->
          <div class="space-y-4 pb-4">
            <label class="block text-xs font-arabic font-semibold uppercase tracking-wide" style="color: var(--color-on-surface-variant);">ملاحظات إضافية</label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="form-input w-full px-4 py-3 rounded-xl text-sm font-arabic outline-none resize-none"
              style="background-color: #f9f9f9; color: var(--color-on-surface); border: none;"
              placeholder="اكتب أي ملاحظات خاصة بالحالة الصحية أو الأكاديمية للطالب..."
            />
          </div>
        </form>

        <!-- Footer (fixed) -->
        <div
          class="px-8 py-6 shrink-0 border-t flex items-center justify-end gap-4"
          style="background-color: rgba(251, 241, 246, 0.5); border-color: rgba(209, 194, 204, 0.3);"
        >
          <button
            type="button"
            class="px-8 py-3 rounded-full font-arabic font-bold transition-colors hover:bg-black/5"
            style="color: var(--color-on-surface-variant);"
            @click="closeAdd"
          >
            إلغاء
          </button>
          <button
            type="button"
            class="px-10 py-3 rounded-full font-arabic font-bold transition-all hover:scale-[1.02] active:scale-95"
            style="background-color: #804c7d; color: white; box-shadow: 0 4px 12px rgba(128, 76, 125, 0.2);"
            @click="handleSubmit"
          >
            حفظ البيانات
          </button>
        </div>

      </div>
    </template>
  </UModal>
</template>

<style scoped>
.form-input:focus {
  border-color: #804c7d !important;
  background-color: white !important;
  box-shadow: 0 0 0 2px rgba(128, 76, 125, 0.1);
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d1c2cc; border-radius: 10px; }
</style>
