<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'

const { t } = useI18n()
const toast = useToast()
const {
  isNotifyParentOpen,
  isNotifySubmitting,
  notifyingStudent,
  closeNotifyParent,
  submitParentNote
} = useStudents()

const state = reactive({ message: '' })

watch(isNotifyParentOpen, (open) => {
  if (open) state.message = ''
})

function validate(s: { message: string }) {
  const errors: Array<{ name: 'message', message: string }> = []
  if (!s.message.trim()) {
    errors.push({ name: 'message', message: t('pages.students.notifyParent.validationRequired') })
  }
  return errors
}

async function onSubmit(_event: FormSubmitEvent<{ message: string }>) {
  const note = await submitParentNote(state.message)
  if (note) {
    toast.add({
      title: t('pages.students.notifyParent.successToast'),
      icon: 'i-lucide-bell',
      color: 'primary'
    })
    closeNotifyParent()
  }
}
</script>

<template>
  <UModal
    v-model:open="isNotifyParentOpen"
    :ui="{ content: 'sm:max-w-lg rounded-2xl' }"
    @close="closeNotifyParent"
  >
    <template #content>
      <div class="flex flex-col">
        <div class="flex justify-between items-start gap-4 px-6 py-5 border-b border-default">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-primary-container shrink-0">
              <UIcon name="i-lucide-bell" class="w-5 h-5 text-primary" />
            </div>
            <div class="min-w-0">
              <h3 class="text-lg font-bold text-on-surface">
                {{ $t('pages.students.notifyParent.title') }}
              </h3>
              <p v-if="notifyingStudent" class="text-sm text-on-surface-variant mt-0.5">
                {{ $t('pages.students.notifyParent.subtitle', { name: notifyingStudent.name }) }}
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
            @click="closeNotifyParent"
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
              :disabled="isNotifySubmitting"
              @click="closeNotifyParent"
            >
              {{ $t('pages.students.notifyParent.cancel') }}
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-send"
              size="lg"
              class="rounded-full px-6 font-bold"
              :loading="isNotifySubmitting"
              :disabled="isNotifySubmitting"
            >
              {{ $t('pages.students.notifyParent.submit') }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
