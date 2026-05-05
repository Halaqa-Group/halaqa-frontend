<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'

const { isEditModalOpen, isEditLoading, editingApiStudent, closeEdit, updateStudent } = useStudents()
const toast = useToast()

type EditForm = {
  name: string
  dob: string
  joinDate: string
  status: 'active' | 'inactive' | 'graduated'
  memPages: number
  nearPages: number
  farPages: number
  notes: string
}

const state = reactive<EditForm>({
  name: '',
  dob: '',
  joinDate: '',
  status: 'active',
  memPages: 0,
  nearPages: 0,
  farPages: 0,
  notes: ''
})

const submitting = ref(false)

watch(editingApiStudent, (student) => {
  if (student) {
    state.name = student.name
    state.dob = student.dob ?? ''
    state.joinDate = student.join_date
    state.status = student.status
    state.memPages = Number(student.daily_hifz_pages_capacity) || 0
    state.nearPages = Number(student.daily_near_pages_capacity) || 0
    state.farPages = Number(student.daily_far_pages_capacity) || 0
    state.notes = student.notes ?? ''
  }
})

function validate(s: EditForm) {
  const errors: Array<{ name: keyof EditForm, message: string }> = []
  if (!s.name.trim()) errors.push({ name: 'name', message: 'اسم الطالب مطلوب' })
  if (!s.joinDate) errors.push({ name: 'joinDate', message: 'تاريخ الانضمام مطلوب' })
  return errors
}

async function handleSubmit(_event: FormSubmitEvent<EditForm>) {
  if (submitting.value || !editingApiStudent.value) return
  submitting.value = true
  try {
    await updateStudent(editingApiStudent.value.id, {
      name: state.name.trim(),
      dob: state.dob || null,
      join_date: state.joinDate,
      status: state.status,
      daily_hifz_pages_capacity: state.memPages,
      daily_near_pages_capacity: state.nearPages,
      daily_far_pages_capacity: state.farPages,
      notes: state.notes.trim() || null
    })
    toast.add({ title: 'تم تحديث بيانات الطالب بنجاح', color: 'success' })
    closeEdit()
  } catch (e: any) {
    const raw = e?.data?.message
    const message = Array.isArray(raw) ? raw.join('، ') : (raw || 'حدث خطأ أثناء تحديث البيانات')
    toast.add({ title: message, color: 'error' })
  } finally {
    submitting.value = false
  }
}

const statusOptions = [
  { label: 'نشط', value: 'active' },
  { label: 'غير نشط', value: 'inactive' },
  { label: 'متخرج', value: 'graduated' }
]
</script>

<template>
  <UModal
    v-model:open="isEditModalOpen"
    :ui="{ content: 'sm:max-w-4xl overflow-hidden' }"
    @close="closeEdit"
  >
    <template #content>
      <div class="flex flex-col" style="max-height: 90vh;">
        <!-- Header -->
        <div class="flex justify-between items-center px-8 py-6 shrink-0 border-b border-default">
          <h3 class="text-xl font-bold text-primary">
            تعديل بيانات الطالب
          </h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="lg"
            square
            :ui="{ base: 'rounded-full' }"
            @click="closeEdit"
          />
        </div>

        <!-- Loading state -->
        <div v-if="isEditLoading" class="flex-1 flex items-center justify-center py-24">
          <UIcon name="i-lucide-loader-circle" class="w-10 h-10 animate-spin" style="color: var(--color-primary);" />
        </div>

        <!-- Form body -->
        <UForm
          v-else
          :state="state"
          :validate="validate"
          class="flex-1 overflow-y-auto px-8 py-8 space-y-10"
          @submit="handleSubmit"
        >
          <!-- Section: Basic info -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Avatar preview -->
            <div
              class="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-default bg-primary/5"
            >
              <img
                v-if="editingApiStudent"
                :src="`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(editingApiStudent.name)}`"
                :alt="editingApiStudent.name"
                class="w-24 h-24 rounded-full object-cover mb-4"
                style="border: 3px solid rgba(128, 76, 125, 0.2);"
              >
              <p class="text-xs font-semibold text-muted">
                صورة الطالب
              </p>
            </div>

            <!-- Fields -->
            <div class="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="الاسم الكامل" name="name" class="sm:col-span-2">
                <UInput v-model="state.name" placeholder="اسم الطالب الرباعي" class="w-full" />
              </UFormField>
              <UFormField label="تاريخ الميلاد" name="dob">
                <UInput v-model="state.dob" type="date" class="w-full" />
              </UFormField>
              <UFormField label="تاريخ الانضمام" name="joinDate">
                <UInput v-model="state.joinDate" type="date" class="w-full" />
              </UFormField>
              <UFormField label="الحالة" name="status">
                <USelect v-model="state.status" :items="statusOptions" class="w-full" />
              </UFormField>
            </div>
          </div>

          <!-- Section: Academic metrics -->
          <div class="space-y-6">
            <div class="flex items-center gap-2 border-e-4 pe-3 border-secondary">
              <h4 class="font-bold text-base text-secondary">
                مقاييس الأداء اليومي
              </h4>
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
                <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-3 text-muted">
                  <UIcon :name="metric.icon" class="w-4 h-4 shrink-0 text-secondary" />
                  {{ metric.label }}
                </label>
                <UInput
                  v-model.number="state[metric.key as keyof EditForm] as number"
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
            <UFormField label="ملاحظات إضافية" name="notes">
              <UTextarea
                v-model="state.notes"
                :rows="3"
                placeholder="اكتب أي ملاحظات خاصة بالحالة الصحية أو الأكاديمية للطالب..."
                class="w-full"
                :ui="{ base: 'resize-none' }"
              />
            </UFormField>
          </div>

          <!-- Footer -->
          <div class="px-0 py-2 flex items-center justify-end gap-4 border-t border-default pt-6">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xl"
              class="font-bold rounded-full px-8"
              @click="closeEdit"
            >
              إلغاء
            </UButton>
            <UButton
              type="submit"
              size="xl"
              :loading="submitting"
              :disabled="submitting"
              class="font-bold rounded-full px-10"
            >
              حفظ التعديلات
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
