<script setup lang="ts">
definePageMeta({ layout: false })

const { login, isLoggedIn } = useAuth()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  isLoading.value = true
  try {
    await login(email.value, password.value)
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
    <div
      class="min-h-screen flex items-center justify-center p-4"
      style="background-color: var(--color-background);"
    >
      <div class="w-full max-w-sm">
        <!-- Logo -->
        <div class="flex flex-col items-center mb-8 gap-3">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center"
            style="background-color: var(--color-primary-container);"
          >
            <UIcon name="i-lucide-book-open-text" class="w-8 h-8" style="color: var(--color-primary);" />
          </div>
          <div class="text-center">
            <h1 class="display-md font-arabic" style="color: var(--color-on-surface);">حلقة</h1>
            <p class="body-sm font-arabic" style="color: var(--color-on-surface-variant);">نظام إدارة الحلقات القرآنية</p>
          </div>
        </div>

        <!-- Card -->
        <div class="rounded-3xl p-8" style="background-color: white; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          <h2 class="body-lg font-arabic font-bold mb-6 text-center" style="color: var(--color-on-surface);">
            تسجيل الدخول
          </h2>

          <form class="flex flex-col gap-4" @submit.prevent="handleLogin">
            <div class="flex flex-col gap-1.5">
              <label class="label-md font-arabic" style="color: var(--color-on-surface-variant);">البريد الإلكتروني</label>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                dir="ltr"
                placeholder="example@school.sa"
                required
                class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
              >
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="label-md font-arabic" style="color: var(--color-on-surface-variant);">كلمة المرور</label>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                dir="ltr"
                placeholder="••••••••"
                required
                class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style="background-color: #F5F5F5; border: 1px solid transparent; color: var(--color-on-surface);"
              >
            </div>

            <div v-if="error" class="rounded-xl px-4 py-3 text-sm font-arabic" style="background-color: #FCE4EC; color: #D81B60;">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-3 rounded-xl text-sm font-arabic font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style="background-color: var(--color-primary); color: white;"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <UIcon name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
                جاري الدخول...
              </span>
              <span v-else>دخول</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </UApp>
</template>
