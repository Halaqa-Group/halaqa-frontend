<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const toast = useToast()
const { submitParentNote } = useStudents()

const submitting = ref(false)
const state = reactive({ message: '' })

function validate(s: { message: string }) {
  const errors: Array<{ name: 'message', message: string }> = []
  if (!s.message.trim()) {
    errors.push({ name: 'message', message: t('pages.students.notifyParent.validationRequired') })
  }
  return errors
}

async function onSubmit(_event: FormSubmitEvent<{ message: string }>) {
  if (submitting.value) return
  submitting.value = true
  try {
    const note = await submitParentNote(props.student.id, state.message)
    if (note) {
      toast.add({
        title: t('pages.students.notifyParent.successToast'),
        icon: 'i-lucide-bell',
        color: 'primary'
      })
      emit('close')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :ui="{ content: 'sm:max-w-lg rounded-2xl' }">
    <template #content>
      <div class="flex flex-col">
        <div class="flex justify-between items-start gap-4 px-6 py-5 border-b border-default">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-primary-container shrink-0">
              <LucideBell class="w-5 h-5 text-primary" />
            </div>
            <div class="min-w-0">
              <h3 class="text-lg font-bold text-on-surface">
                {{ $t('pages.students.notifyParent.title') }}
              </h3>
              <p class="text-sm text-on-surface-variant mt-0.5">
                {{ $t('pages.students.notifyParent.subtitle', { name: student.name }) }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :ui="{ base: 'rounded-full' }"
            @click="emit('close')"
          />
        </div>

        <UForm
          :state="state"
          :validate="validate"
          class="px-6 py-6 space-y-5"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('pages.students.notifyParent.messageLabel')"
            name="message"
          >
            <UTextarea
              v-model="state.message"
              :rows="5"
              :placeholder="$t('pages.students.notifyParent.placeholder')"
              autofocus
              class="w-full"
              :ui="{ base: 'resize-none rounded-xl' }"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-2 border-t border-default">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="lg"
              class="rounded-full px-6"
              :disabled="submitting"
              @click="emit('close')"
            >
              {{ $t('pages.students.notifyParent.cancel') }}
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-send"
              size="lg"
              class="rounded-full px-6 font-bold"
              :loading="submitting"
              :disabled="submitting"
            >
              {{ $t('pages.students.notifyParent.submit') }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
