<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'

const { isAddModalOpen, closeAdd } = useStudents()

type StudentForm = {
  name: string
  dob: string
  joinDate: string
  fatherName: string
  motherName: string
  fatherEmail: string
  motherEmail: string
  memPages: number
  nearPages: number
  farPages: number
  notes: string
}

const state = reactive<StudentForm>({
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

function validate(s: StudentForm) {
  const errors: Array<{ name: keyof StudentForm, message: string }> = []
  if (!s.name.trim()) errors.push({ name: 'name', message: 'اسم الطالب مطلوب' })
  if (!s.dob) errors.push({ name: 'dob', message: 'تاريخ الميلاد مطلوب' })
  if (!s.joinDate) errors.push({ name: 'joinDate', message: 'تاريخ الانضمام مطلوب' })
  if (s.fatherEmail && !/^\S+@\S+\.\S+$/.test(s.fatherEmail)) errors.push({ name: 'fatherEmail', message: 'صيغة البريد غير صحيحة' })
  if (s.motherEmail && !/^\S+@\S+\.\S+$/.test(s.motherEmail)) errors.push({ name: 'motherEmail', message: 'صيغة البريد غير صحيحة' })
  return errors
}

function handleSubmit(_event: FormSubmitEvent<StudentForm>) {
  // TODO: wire to useStudents().createStudent once composable exposes it.
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
        <div class="flex justify-between items-center px-8 py-6 shrink-0 border-b border-default">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <UIcon name="i-lucide-user-plus" class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 class="text-xl font-bold font-arabic text-primary">إضافة طالب جديد</h3>
              <p class="text-xs font-arabic text-muted">أدخل بيانات الطالب للبدء في تتبع التقدم التعليمي</p>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="lg"
            square
            :ui="{ base: 'rounded-full' }"
            @click="closeAdd"
          />
        </div>

        <!-- Scrollable form body -->
        <UForm
          :state="state"
          :validate="validate"
          class="flex-1 overflow-y-auto px-8 py-8 space-y-10"
          @submit="handleSubmit"
        >
          <!-- Section: Photo upload + basic info -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Photo upload zone -->
            <div
              class="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-default bg-primary/5 cursor-pointer transition-all group hover:border-primary/50"
            >
              <div class="w-24 h-24 rounded-full bg-default shadow-sm flex items-center justify-center mb-4 overflow-hidden">
                <UIcon
                  name="i-lucide-camera"
                  class="w-10 h-10 text-muted transition-colors group-hover:text-primary"
                />
              </div>
              <p class="text-xs font-arabic font-semibold uppercase tracking-wide text-muted">رفع صورة الطالب</p>
              <p class="text-[10px] mt-1 text-dimmed">PNG, JPG حتى 5MB</p>
            </div>

            <!-- Basic info grid -->
            <div class="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="الاسم الكامل" name="name" class="sm:col-span-2 font-arabic">
                <UInput v-model="state.name" placeholder="اسم الطالب الرباعي" class="w-full font-arabic" />
              </UFormField>
              <UFormField label="تاريخ الميلاد" name="dob" class="font-arabic">
                <UInput v-model="state.dob" type="date" class="w-full" />
              </UFormField>
              <UFormField label="تاريخ الانضمام" name="joinDate" class="font-arabic">
                <UInput v-model="state.joinDate" type="date" class="w-full" />
              </UFormField>
            </div>
          </div>

          <!-- Section: Parent info -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-e-4 pe-3 border-primary">
              <h4 class="font-arabic font-bold text-base text-primary">معلومات ولي الأمر</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <!-- Father column -->
              <div class="space-y-4">
                <UFormField label="اسم الأب" name="fatherName" class="font-arabic">
                  <UInput v-model="state.fatherName" class="w-full font-arabic" />
                </UFormField>
                <UFormField label="بريد الأب الإلكتروني" name="fatherEmail" class="font-arabic">
                  <UInput v-model="state.fatherEmail" type="email" dir="ltr" class="w-full" />
                </UFormField>
              </div>
              <!-- Mother column -->
              <div class="space-y-4">
                <UFormField label="اسم الأم" name="motherName" class="font-arabic">
                  <UInput v-model="state.motherName" class="w-full font-arabic" />
                </UFormField>
                <UFormField label="بريد الأم الإلكتروني" name="motherEmail" class="font-arabic">
                  <UInput v-model="state.motherEmail" type="email" dir="ltr" class="w-full" />
                </UFormField>
              </div>
            </div>
          </div>

          <!-- Section: Academic metrics -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-e-4 pe-3 border-secondary">
              <h4 class="font-arabic font-bold text-base text-secondary">مقاييس الأداء اليومي</h4>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <UCard
                v-for="metric in [
                  { key: 'memPages', icon: 'i-lucide-book-open', label: 'صفحات الحفظ الجديد' },
                  { key: 'nearPages', icon: 'i-lucide-history', label: 'صفحات المراجعة القريبة' },
                  { key: 'farPages', icon: 'i-lucide-repeat', label: 'صفحات المراجعة البعيدة' }
                ]"
                :key="metric.key"
                :ui="{ root: 'rounded-2xl', body: 'p-5' }"
              >
                <label class="flex items-center gap-2 text-xs font-arabic font-semibold uppercase tracking-wide mb-3 text-muted">
                  <UIcon :name="metric.icon" class="w-4 h-4 shrink-0 text-secondary" />
                  {{ metric.label }}
                </label>
                <UInput
                  v-model.number="state[metric.key as keyof StudentForm] as number"
                  type="number"
                  :min="0"
                  placeholder="0"
                  size="xl"
                  class="w-full"
                  :ui="{ base: 'text-lg font-bold text-center text-primary' }"
                />
              </UCard>
            </div>
          </div>

          <!-- Section: Notes -->
          <div class="space-y-4 pb-4">
            <UFormField label="ملاحظات إضافية" name="notes" class="font-arabic">
              <UTextarea
                v-model="state.notes"
                :rows="3"
                placeholder="اكتب أي ملاحظات خاصة بالحالة الصحية أو الأكاديمية للطالب..."
                class="w-full font-arabic"
                :ui="{ base: 'resize-none' }"
              />
            </UFormField>
          </div>

          <!-- Footer (inside UForm so submit button works) -->
          <div class="px-0 py-2 flex items-center justify-end gap-4 border-t border-default pt-6">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xl"
              class="font-arabic font-bold rounded-full px-8"
              @click="closeAdd"
            >
              إلغاء
            </UButton>
            <UButton
              type="submit"
              size="xl"
              class="font-arabic font-bold rounded-full px-10"
            >
              حفظ البيانات
            </UButton>
          </div>
        </UForm>

      </div>
    </template>
  </UModal>
</template>
