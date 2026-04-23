<script setup lang="ts">
const { isViewModalOpen, viewingStudent, closeView } = useStudents()
</script>

<template>
  <UModal v-model:open="isViewModalOpen" :ui="{ width: 'max-w-3xl' }" @close="closeView">
    <template #content>
      <div v-if="viewingStudent" class="flex min-h-[500px]" dir="rtl">
        <!-- Right sidebar: profile -->
        <div
          class="w-72 shrink-0 flex flex-col gap-5 p-6 rounded-r-2xl"
          style="background-color: var(--color-surface-container-low); border-left: 1px solid var(--color-outline-variant);"
        >
          <!-- Close button -->
          <div class="flex justify-start">
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
              @click="closeView"
            >
              <UIcon name="i-lucide-x" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
            </button>
          </div>

          <!-- Avatar + name -->
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="relative">
              <img :src="viewingStudent.avatar" class="w-20 h-20 rounded-full" :alt="viewingStudent.name">
              <span
                class="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white"
                :class="viewingStudent.status === 'active' ? 'bg-[#4A8E85]' : 'bg-[--color-outline]'"
              />
            </div>
            <div>
              <p class="display-md font-arabic" style="color: var(--color-on-surface);">{{ viewingStudent.name }}</p>
              <p class="body-md font-arabic" style="color: var(--color-on-surface-variant);">{{ viewingStudent.halaqa }}</p>
            </div>
          </div>

          <!-- Attendance summary -->
          <div>
            <div class="flex justify-between mb-1">
              <span class="label-md font-arabic" style="color: var(--color-on-surface-variant);">الحضور</span>
              <span class="label-md font-semibold" style="color: var(--color-primary);">{{ viewingStudent.attendance }}%</span>
            </div>
            <div class="h-2 rounded-full overflow-hidden" style="background-color: var(--color-surface-container);">
              <div
                class="h-full rounded-full"
                style="background-color: var(--color-primary);"
                :style="`width: ${viewingStudent.attendance}%;`"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2 mt-auto">
            <UButton block variant="soft" color="neutral" icon="i-lucide-file-edit" label="تعديل الملف" />
            <UButton block variant="soft" color="primary" icon="i-lucide-message-square" label="إرسال رسالة" />
          </div>
        </div>

        <!-- Left content: details -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <!-- Progress section -->
          <div class="rounded-2xl p-4" style="background-color: var(--color-surface-container-low);">
            <p class="body-lg font-arabic font-semibold mb-3" style="color: var(--color-on-surface);">التقدم الدراسي</p>
            <p class="label-md font-arabic mb-1" style="color: var(--color-on-surface-variant);">السورة الحالية: {{ viewingStudent.currentSurah }}</p>
            <div class="h-3 rounded-full overflow-hidden" style="background-color: var(--color-surface-container);">
              <div
                class="h-full rounded-full"
                style="background-color: var(--color-primary);"
                :style="`width: ${viewingStudent.progress}%;`"
              />
            </div>
            <p class="label-md mt-1" style="color: var(--color-primary);">{{ viewingStudent.progress }}%</p>
          </div>

          <!-- Stats grid -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-xl p-3 text-center" style="background-color: #E0F0EE;">
              <p class="display-md" style="color: #4A8E85;">2</p>
              <p class="label-md font-arabic" style="color: #4A8E85;">صفحات حفظ</p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background-color: #E3F2FD;">
              <p class="display-md" style="color: #2196F3;">3</p>
              <p class="label-md font-arabic" style="color: #2196F3;">مراجعة قريبة</p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background-color: #EBEDF0;">
              <p class="display-md" style="color: #546E7A;">5</p>
              <p class="label-md font-arabic" style="color: #546E7A;">مراجعة بعيدة</p>
            </div>
          </div>

          <!-- Parent info -->
          <div class="rounded-2xl p-4" style="background-color: var(--color-surface-container-low);">
            <p class="body-lg font-arabic font-semibold mb-3" style="color: var(--color-on-surface);">معلومات ولي الأمر</p>
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-user" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
                <span class="body-md font-arabic" style="color: var(--color-on-surface);">والد الطالب</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-phone" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
                <span class="body-md" style="color: var(--color-on-surface);" dir="ltr">+966 50 000 0000</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-mail" class="w-4 h-4" style="color: var(--color-on-surface-variant);" />
                <span class="body-md" style="color: var(--color-on-surface);">parent@example.com</span>
              </div>
            </div>
          </div>

          <!-- Recent comments -->
          <div class="rounded-2xl p-4" style="background-color: var(--color-surface-container-low);">
            <p class="body-lg font-arabic font-semibold mb-3" style="color: var(--color-on-surface);">آخر الملاحظات</p>
            <div class="flex flex-col gap-2">
              <div class="p-3 rounded-xl" style="background-color: var(--color-surface-container-lowest);">
                <p class="body-md font-arabic" style="color: var(--color-on-surface);">تفاعل ممتاز اليوم، أتم الحفظ بنجاح</p>
                <p class="label-md font-arabic mt-1" style="color: var(--color-on-surface-variant);">منذ يومين</p>
              </div>
              <div class="p-3 rounded-xl" style="background-color: var(--color-surface-container-lowest);">
                <p class="body-md font-arabic" style="color: var(--color-on-surface);">يحتاج مراجعة في أحكام التجويد</p>
                <p class="label-md font-arabic mt-1" style="color: var(--color-on-surface-variant);">منذ أسبوع</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
