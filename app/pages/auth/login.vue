<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { login } = useAuth()
const apiError = useApiError()
const toast = useToast()

// The backend accepts email OR national ID; a single free-text field takes
// either and useAuth.login() decides which based on the "@".
const schema = z.object({
  identifier: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required')),
  password: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required'))
    .min(6, t('validation.min', { min: 6 })),
  remember_me: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  identifier: undefined,
  password: undefined,
  remember_me: false
})

const isLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isLoading.value = true
  try {
    await login(event.data.identifier, event.data.password, event.data.remember_me ?? false)
    await navigateTo('/')
  } catch (e: unknown) {
    toast.add({
      description: apiError.format(e, t('auth.invalidCredentials')),
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div class="mb-10">
      <h1 class="text-highlighted text-3xl font-bold mb-1">
        {{ $t('pages.login.title') }}
      </h1>
      <p class="text-muted">
        {{ $t('pages.login.description') }}
      </p>
    </div>
    <UForm ref="form" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField :label="$t('label.email_or_id')" name="identifier">
        <UInput v-model="state.identifier" dir="ltr" :placeholder="$t('placeholder.email_or_id')" />
      </UFormField>
      <UFormField :label="$t('label.password')" name="password">
        <CommonPasswordToggle v-model:password="state.password" :placeholder="$t('placeholder.password')" />
      </UFormField>
      <div class="flex items-center justify-between">
        <UCheckbox v-model="state.remember_me" :label="$t('label.remember_me')" name="remember" />
        <NuxtLink to="/auth/forgot-password" class="text-sm text-primary hover:underline">
          {{ $t('auth.forgotPasswordLink') }}
        </NuxtLink>
      </div>
      <UButton type="submit" :label="$t('action.sign_in')" :loading="isLoading" block />
    </UForm>
  </div>
</template>
