<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({ layout: false })

const { t } = useI18n()
const { login } = useAuth()

type LoginState = { email: string, password: string }
const state = reactive<LoginState>({ email: '', password: '' })
const isLoading = ref(false)
const error = ref('')

function validate(s: LoginState) {
  const errors: Array<{ name: keyof LoginState, message: string }> = []
  if (!s.email) errors.push({ name: 'email', message: t('validation.emailRequired') })
  else if (!/^\S[^\s@]*@\S[^\s.]*\.\S+$/.test(s.email)) errors.push({ name: 'email', message: t('validation.emailInvalid') })
  if (!s.password) errors.push({ name: 'password', message: t('validation.passwordRequired') })
  return errors
}

async function handleSubmit(event: FormSubmitEvent<LoginState>) {
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
  <UApp>
    <div class="min-h-screen flex items-center justify-center p-4 bg-default">
      <div class="w-full max-w-sm">
        <div class="flex flex-col items-center mb-8 gap-3">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10">
            <UIcon name="i-lucide-book-open-text" class="w-8 h-8 text-primary" />
          </div>
          <div class="text-center">
            <h1 class="display-md text-highlighted">
              {{ $t('app.name') }}
            </h1>
            <p class="body-sm text-muted">
              {{ $t('app.tagline') }}
            </p>
          </div>
        </div>

        <!-- Card -->
        <UCard :ui="{ root: 'rounded-2xl', body: 'p-8' }">
          <h2 class="body-lg font-bold mb-6 text-center text-highlighted">
            {{ $t('auth.login') }}
          </h2>

          <UForm
            :state="state"
            :validate="validate"
            class="flex flex-col gap-4"
            @submit="handleSubmit"
          >
            <UFormField :label="$t('auth.email')" name="email">
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                dir="ltr"
                placeholder="example@school.sa"
                block
                size="lg"
              />
            </UFormField>

            <UFormField :label="$t('auth.password')" name="password">
              <UInput
                v-model="state.password"
                type="password"
                autocomplete="current-password"
                dir="ltr"
                placeholder="••••••••"
                block
                size="lg"
              />
            </UFormField>

            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              :title="error"
            />

            <UButton
              type="submit"
              block
              size="lg"
              :loading="isLoading"
              :disabled="isLoading"
              class="font-bold"
            >
              {{ isLoading ? $t('auth.loggingIn') : $t('auth.loginButton') }}
            </UButton>
          </UForm>
        </UCard>
      </div>
    </div>
  </UApp>
</template>
