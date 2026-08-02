<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const { validateResetToken, resetPassword } = useAuth()
const apiError = useApiError()

const token = computed(() => {
  const raw = route.query.token
  return typeof raw === 'string' ? raw : ''
})

const verifying = ref(true)
const tokenValid = ref(false)
const tokenEmail = ref('')

const schema = z.object({
  password: z.string({ error: () => t('validation.required') })
    .min(8, t('validation.min', { min: 8 })),
  password_confirmation: z.string({ error: () => t('validation.required') })
}).refine(d => d.password === d.password_confirmation, {
  message: t('auth.passwordMismatch'),
  path: ['password_confirmation']
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  password: undefined,
  password_confirmation: undefined
})

const isLoading = ref(false)
const error = ref('')

onMounted(async () => {
  if (!token.value) {
    verifying.value = false
    return
  }
  try {
    const { email } = await validateResetToken(token.value)
    tokenEmail.value = email
    tokenValid.value = true
  } catch {
    tokenValid.value = false
  } finally {
    verifying.value = false
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  isLoading.value = true
  try {
    await resetPassword(token.value, event.data.password, event.data.password_confirmation)
    toast.add({ title: t('pages.resetPassword.successToast'), color: 'success' })
    await navigateTo('/auth/login')
  } catch (e: unknown) {
    error.value = apiError.format(e, t('auth.genericError'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div v-if="verifying" class="text-muted text-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin w-6 h-6 mb-3" />
      <p>{{ $t('pages.resetPassword.verifying') }}</p>
    </div>

    <template v-else-if="tokenValid">
      <div class="mb-10">
        <h1 class="text-highlighted text-3xl font-bold mb-1">
          {{ $t('pages.resetPassword.title') }}
        </h1>
        <p class="text-muted">
          {{ $t('pages.resetPassword.description', { email: tokenEmail }) }}
        </p>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <UFormField :label="$t('label.new_password')" name="password">
          <CommonPasswordToggle v-model:password="state.password" :placeholder="$t('placeholder.new_password')" />
        </UFormField>
        <UFormField :label="$t('label.password_confirmation')" name="password_confirmation">
          <CommonPasswordToggle
            v-model:password="state.password_confirmation"
            :placeholder="$t('placeholder.password_confirmation')"
          />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :title="error" />
        <UButton type="submit" :label="$t('action.reset_password')" :loading="isLoading" block />
      </UForm>
    </template>

    <template v-else>
      <div class="mb-8">
        <h1 class="text-highlighted text-3xl font-bold mb-1">
          {{ $t('pages.resetPassword.expiredTitle') }}
        </h1>
        <p class="text-muted">
          {{ $t('pages.resetPassword.expiredDescription') }}
        </p>
      </div>
      <UButton to="/auth/forgot-password" :label="$t('pages.resetPassword.requestNew')" block />
    </template>

    <NuxtLink to="/auth/login" class="text-sm text-primary hover:underline mt-6 inline-flex items-center gap-1">
      <UIcon name="i-lucide-arrow-right" class="rtl:rotate-180" />
      {{ $t('pages.forgotPassword.backToLogin') }}
    </NuxtLink>
  </div>
</template>
