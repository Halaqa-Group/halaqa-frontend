<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ManagedUser } from '~/composables/useUsers'

const props = defineProps<{ open: boolean, user: ManagedUser }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'reset': []
}>()

const { t } = useI18n()
const toast = useToast()
const usersApi = useUsers()
const apiError = useApiError()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

const schema = z.object({
  password: z.string({ error: () => t('validation.required') }).min(8, t('validation.min', { min: 8 })),
  password_confirmation: z.string({ error: () => t('validation.required') })
}).refine(d => d.password === d.password_confirmation, {
  message: t('auth.passwordMismatch'),
  path: ['password_confirmation']
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({ password: '', password_confirmation: '' })
const isLoading = ref(false)
const error = ref('')

watch(isOpen, (v) => {
  if (v) {
    state.password = ''
    state.password_confirmation = ''
    error.value = ''
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  isLoading.value = true
  try {
    await usersApi.adminResetPassword(props.user.id, event.data)
    toast.add({ title: t('pages.users.adminReset.savedToast'), color: 'success' })
    emit('reset')
  } catch (e: unknown) {
    error.value = apiError.format(e, t('auth.genericError'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #header>
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-error/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-key-round" class="w-5 h-5 text-error" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-highlighted">
            {{ $t('pages.users.adminReset.title', { name: user.name }) }}
          </h3>
          <p class="text-sm text-muted mt-1">
            {{ $t('pages.users.adminReset.description') }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <UForm
        id="user-reset-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="$t('pages.users.adminReset.warning')"
        />

        <UFormField :label="$t('label.new_password')" name="password" required>
          <CommonPasswordToggle
            v-model:password="state.password"
            :placeholder="$t('placeholder.new_password')"
          />
        </UFormField>

        <UFormField :label="$t('label.password_confirmation')" name="password_confirmation" required>
          <CommonPasswordToggle
            v-model:password="state.password_confirmation"
            :placeholder="$t('placeholder.password_confirmation')"
          />
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :title="error" />
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center gap-2 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          size="lg"
          block
          class="flex-1 rounded-full"
          @click="isOpen = false"
        >
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="user-reset-form"
          color="error"
          size="lg"
          block
          class="flex-1 rounded-full font-semibold"
          :loading="isLoading"
        >
          {{ $t('pages.users.adminReset.saveButton') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
