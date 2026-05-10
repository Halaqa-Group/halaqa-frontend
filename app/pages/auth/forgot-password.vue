<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { forgotPassword } = useAuth()
const apiError = useApiError()

const schema = z.object({
  email: z.email({ error: () => t('validation.email') })
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ email: undefined })
const isLoading = ref(false)
const submitted = ref(false)
const error = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  isLoading.value = true
  try {
    await forgotPassword(event.data.email)
    submitted.value = true
  } catch (e: unknown) {
    error.value = apiError.format(e, t('auth.genericError'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div class="mb-10">
      <h1 class="text-highlighted text-3xl font-bold mb-1">
        {{ submitted ? $t('pages.forgotPassword.successTitle') : $t('pages.forgotPassword.title') }}
      </h1>
      <p class="text-muted">
        {{ submitted ? $t('pages.forgotPassword.successDescription') : $t('pages.forgotPassword.description') }}
      </p>
    </div>

    <UForm
      v-if="!submitted"
      :schema="schema"
      :state="state"
      class="space-y-5"
      @submit="onSubmit"
    >
      <UFormField :label="$t('label.email_address')" name="email">
        <UInput v-model="state.email" placeholder="john.doe@email.com" />
      </UFormField>
      <UAlert v-if="error" color="error" variant="soft" :title="error" />
      <UButton type="submit" :label="$t('action.send_reset_link')" :loading="isLoading" block />
    </UForm>

    <NuxtLink to="/auth/login" class="text-sm text-primary hover:underline mt-6 inline-flex items-center gap-1">
      <LucideArrowRight class="rtl:rotate-180" />
      {{ $t('pages.forgotPassword.backToLogin') }}
    </NuxtLink>
  </div>
</template>
