<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({ layout: false })

const { login } = useAuth()

type LoginState = { email: string, password: string }
const state = reactive<LoginState>({ email: '', password: '' })
const isLoading = ref(false)
const error = ref('')

function validate(s: LoginState) {
  const errors: Array<{ name: keyof LoginState, message: string }> = []
  if (!s.email) errors.push({ name: 'email', message: 'البريد الإلكتروني مطلوب' })
  else if (!/^\S+@\S+\.\S+$/.test(s.email)) errors.push({ name: 'email', message: 'صيغة البريد غير صحيحة' })
  if (!s.password) errors.push({ name: 'password', message: 'كلمة المرور مطلوبة' })
  return errors
}

async function handleSubmit(event: FormSubmitEvent<LoginState>) {
  error.value = ''
  isLoading.value = true
  try {
    await login(event.data.email, event.data.password)
    await navigateTo('/')
  }
  catch (e: any) {
    error.value = e?.data?.message || 'بيانات الدخول غير صحيحة'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center p-4 bg-default">
      <div class="w-full max-w-sm">
        <!-- Logo -->
        <div class="flex flex-col items-center mb-8 gap-3">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10">
            <UIcon name="i-lucide-book-open-text" class="w-8 h-8 text-primary" />
          </div>
          <div class="text-center">
            <h1 class="display-md font-arabic text-highlighted">حلقة</h1>
            <p class="body-sm font-arabic text-muted">نظام إدارة الحلقات القرآنية</p>
          </div>
        </div>

        <!-- Card -->
        <UCard :ui="{ root: 'rounded-3xl', body: 'p-8' }">
          <h2 class="body-lg font-arabic font-bold mb-6 text-center text-highlighted">
            تسجيل الدخول
          </h2>

          <UForm
            :state="state"
            :validate="validate"
            class="flex flex-col gap-4"
            @submit="handleSubmit"
          >
            <UFormField label="البريد الإلكتروني" name="email" class="font-arabic">
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                dir="ltr"
                placeholder="example@school.sa"
                class="w-full"
              />
            </UFormField>

            <UFormField label="كلمة المرور" name="password" class="font-arabic">
              <UInput
                v-model="state.password"
                type="password"
                autocomplete="current-password"
                dir="ltr"
                placeholder="••••••••"
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              :title="error"
              :ui="{ root: 'font-arabic' }"
            />

            <UButton
              type="submit"
              block
              size="lg"
              :loading="isLoading"
              :disabled="isLoading"
              class="font-arabic font-bold"
            >
              {{ isLoading ? 'جاري الدخول...' : 'دخول' }}
            </UButton>
          </UForm>
        </UCard>
      </div>
    </div>
  </UApp>
</template>
