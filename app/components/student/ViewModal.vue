<script setup lang="ts">
const { isViewModalOpen, viewingStudent, closeView, openEdit } = useStudents()

function handleEditClick() {
  if (!viewingStudent.value) return
  closeView()
  openEdit(viewingStudent.value)
}
</script>

<template>
  <UModal
    v-model:open="isViewModalOpen"
    :ui="{ content: 'sm:max-w-4xl max-h-[90vh] overflow-hidden p-0 rounded-2xl' }"
    @close="closeView"
  >
    <template #content>
      <div v-if="viewingStudent" class="flex flex-col lg:flex-row min-h-[560px] max-h-[90vh]">
        <!-- Profile panel (visually trailing side — right in RTL, left in LTR) -->
        <div
          class="w-full lg:w-1/3 shrink-0 flex flex-col items-center text-center p-8 gap-6 border-e border-outline-variant bg-surface-container-low"
        >
          <!-- Avatar with status badge -->
          <div class="relative">
            <img
              :src="viewingStudent.avatar"
              :alt="viewingStudent.name"
              class="w-32 h-32 rounded-full object-cover"
              style="border: 4px solid white; box-shadow: 0 2px 12px rgba(128,76,125,0.12);"
            >
            <span
              class="absolute bottom-2 end-0 px-3 py-1 rounded-full text-xs font-bold"
              :style="viewingStudent.status === 'active'
                ? 'background-color: var(--color-secondary); color: var(--color-on-secondary);'
                : 'background-color: var(--color-outline); color: white;'"
            >{{ viewingStudent.status === 'active' ? 'نشط' : 'غير نشط' }}</span>
          </div>

          <!-- Name + level -->
          <div class="space-y-1">
            <h2 class="display-md" style="color: var(--color-on-surface);">
              {{ viewingStudent.name }}
            </h2>
            <p class="body-md" style="color: var(--color-on-surface-variant);">
              {{ viewingStudent.halaqa }}
            </p>
          </div>

          <!-- Attendance summary card -->
          <div class="w-full rounded-xl p-4 space-y-3" style="background-color: var(--color-surface-container-lowest); box-shadow: var(--shadow-card);">
            <div class="flex justify-between items-center">
              <span class="body-md" style="color: var(--color-on-surface-variant);">ملخص الحضور</span>
              <span class="body-lg font-bold" style="color: var(--color-primary);">{{ viewingStudent.attendance }}%</span>
            </div>
            <div class="w-full h-2 rounded-full overflow-hidden" style="background-color: var(--color-surface-container);">
              <div
                class="h-full rounded-full transition-all"
                style="background-color: var(--color-secondary);"
                :style="`width: ${viewingStudent.attendance}%;`"
              />
            </div>
          </div>

          <!-- Action buttons -->
          <div class="w-full flex flex-col gap-3 mt-auto">
            <UButton
              block
              color="primary"
              icon="i-lucide-file-edit"
              label="تعديل الملف"
              class="rounded-full"
              @click="handleEditClick"
            />
            <UButton
              block
              variant="outline"
              color="primary"
              icon="i-lucide-send"
              label="إرسال رسالة"
              class="rounded-full"
            />
            <UButton
              variant="ghost"
              color="neutral"
              block
              label="إغلاق"
              class="w-full py-2 body-md hover:opacity-70 font-normal"
              style="color: var(--color-outline);"
              @click="closeView"
            />
          </div>
        </div>

        <!-- Content panel (visually left in RTL) -->
        <div class="flex-1 overflow-y-auto p-8 flex flex-col gap-6" style="background-color: white;">
          <!-- Section header -->
          <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid var(--color-outline-variant);">
            <UIcon name="i-lucide-trending-up" class="w-6 h-6" style="color: var(--color-primary);" />
            <h3 class="display-md" style="color: var(--color-primary);">
              تطور الحفظ والتحصيل
            </h3>
          </div>

          <!-- Current progress card -->
          <div class="rounded-xl p-6" style="background-color: var(--color-surface-container-low);">
            <div class="flex justify-between items-end mb-4">
              <div>
                <span class="label-md block mb-1" style="color: var(--color-on-surface-variant);">السورة الحالية</span>
                <span class="display-md" style="color: var(--color-on-surface);">سورة {{ viewingStudent.currentSurah }}</span>
              </div>
              <span class="display-md" style="color: var(--color-primary);">{{ viewingStudent.progress }}%</span>
            </div>
            <div class="w-full h-3 rounded-full overflow-hidden" style="background-color: var(--color-surface-container-high);">
              <div
                class="h-full rounded-full transition-all"
                style="background-color: var(--color-primary);"
                :style="`width: ${viewingStudent.progress}%;`"
              />
            </div>
            <!-- Page stats -->
            <div class="mt-4 grid grid-cols-3 gap-3">
              <div class="text-center p-3 rounded-lg" style="background-color: white;">
                <span class="label-md block" style="color: var(--color-on-surface-variant);">الحفظ الجديد</span>
                <span class="body-lg font-bold" style="color: var(--color-on-surface);">3 صفحات</span>
              </div>
              <div class="text-center p-3 rounded-lg" style="background-color: white;">
                <span class="label-md block" style="color: var(--color-on-surface-variant);">مراجعة قريبة</span>
                <span class="body-lg font-bold" style="color: var(--color-on-surface);">5 صفحات</span>
              </div>
              <div class="text-center p-3 rounded-lg" style="background-color: white;">
                <span class="label-md block" style="color: var(--color-on-surface-variant);">مراجعة بعيدة</span>
                <span class="body-lg font-bold" style="color: var(--color-on-surface);">15 صفحة</span>
              </div>
            </div>
          </div>

          <!-- Metrics grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Daily capacity -->
            <div class="rounded-xl p-5" style="border: 1px solid var(--color-outline-variant);">
              <h4 class="body-lg font-bold mb-4 flex items-center gap-2" style="color: var(--color-on-surface);">
                <UIcon name="i-lucide-bar-chart-2" class="w-5 h-5" style="color: var(--color-secondary);" />
                الاستيعاب اليومي
              </h4>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="body-md" style="color: var(--color-on-surface);">الحفظ (Hifz)</span>
                  <span class="body-md font-bold" style="color: var(--color-on-surface);">ممتاز</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="body-md" style="color: var(--color-on-surface);">قريب (Near)</span>
                  <span class="body-md font-bold" style="color: var(--color-on-surface);">جيد جداً</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="body-md" style="color: var(--color-on-surface);">بعيد (Far)</span>
                  <span class="body-md font-bold" style="color: var(--color-on-surface);">منتظم</span>
                </div>
              </div>
            </div>

            <!-- Parent info -->
            <div class="rounded-xl p-5" style="border: 1px solid var(--color-outline-variant);">
              <h4 class="body-lg font-bold mb-4 flex items-center gap-2" style="color: var(--color-on-surface);">
                <UIcon name="i-lucide-users" class="w-5 h-5" style="color: var(--color-secondary);" />
                معلومات ولي الأمر
              </h4>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-user" class="w-4 h-4 shrink-0" style="color: var(--color-outline);" />
                  <span class="body-md" style="color: var(--color-on-surface);">أ. عبدالرحمن محمد</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-phone" class="w-4 h-4 shrink-0" style="color: var(--color-outline);" />
                  <span class="body-md" style="color: var(--color-on-surface);" dir="ltr">+966 50 123 4567</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-mail" class="w-4 h-4 shrink-0" style="color: var(--color-outline);" />
                  <span class="body-md" style="color: var(--color-on-surface);">a.rahman@email.com</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent notes -->
          <div class="rounded-xl p-5" style="border: 1px solid var(--color-outline-variant);">
            <h4 class="body-lg font-bold mb-4" style="color: var(--color-on-surface);">
              آخر الملاحظات
            </h4>
            <div
              class="p-4 rounded-lg border-e-4"
              style="background-color: var(--color-surface-container-low); border-color: var(--color-primary);"
            >
              <p class="body-md" style="color: var(--color-on-surface);">
                أميرة تظهر تفوقاً ملحوظاً في ضبط مخارج الحروف. تحتاج إلى التركيز أكثر على مراجعة الصفحات الخمس الأخيرة من سورة مريم لثبات الحفظ.
              </p>
              <span class="block mt-2 label-md" style="color: var(--color-outline);">
                تم التحديث بواسطة الشيخ أحمد · أمس
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
