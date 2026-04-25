<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const { login } = useAuth()

const schema = z.object({
  email: z.email({ error: () => t('validation.email') }),
  password: z.string({ error: () => t('validation.required') })
    .min(1, t('validation.required'))
    .min(6, t('validation.min', { min: 6 })),
  remember_me: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined,
  remember_me: false
})

const isLoading = ref(false)
const error = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  isLoading.value = true
  try {
    await login(event.data.email, event.data.password)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message || t('auth.invalidCredentials')
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
      <UFormField :label="$t('label.email_address')" name="email">
        <UInput v-model="state.email" placeholder="john.doe@email.com" />
      </UFormField>
      <UFormField :label="$t('label.password')" name="password">
        <CommonPasswordToggle v-model:password="state.password" :placeholder="$t('placeholder.password')" />
      </UFormField>
      <UCheckbox v-model="state.remember_me" :label="$t('label.remember_me')" name="remember" />
      <UButton type="submit" :label="$t('action.sign_in')" :loading="isLoading" block />
    </UForm>
  </div>
</template>
