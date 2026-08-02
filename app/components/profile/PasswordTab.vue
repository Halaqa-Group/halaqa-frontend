<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { changePassword } = useAuth()
const apiError = useApiError()

const schema = z.object({
  currentPassword: z.string({ error: () => t('validation.required') }).min(1, t('validation.required')),
  password: z.string({ error: () => t('validation.required') })
    .min(8, t('validation.min', { min: 8 })),
  password_confirmation: z.string({ error: () => t('validation.required') })
}).refine(d => d.password === d.password_confirmation, {
  message: t('auth.passwordMismatch'),
  path: ['password_confirmation']
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  currentPassword: '',
  password: '',
  password_confirmation: ''
})

const isLoading = ref(false)
const error = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  isLoading.value = true
  try {
    await changePassword(event.data)
    toast.add({ description: t('pages.profile.securityCard.savedToast'), color: 'success' })
    state.currentPassword = ''
    state.password = ''
    state.password_confirmation = ''
  } catch (e: unknown) {
    error.value = apiError.format(e, t('auth.genericError'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UCard :ui="{ root: 'mt-4' }">
    <template #header>
      <div>
        <h4 class="font-semibold text-base">
          {{ $t('pages.profile.securityCard.title') }}
        </h4>
        <p class="text-sm text-muted">
          {{ $t('pages.profile.securityCard.description') }}
        </p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField :label="$t('label.current_password')" name="currentPassword" required>
        <CommonPasswordToggle v-model:password="state.currentPassword" />
      </UFormField>
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

      <div class="flex justify-end">
        <UButton
          type="submit"
          :label="$t('pages.profile.securityCard.saveButton')"
          :loading="isLoading"
        />
      </div>
    </UForm>
  </UCard>
</template>
