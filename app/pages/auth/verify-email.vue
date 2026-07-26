<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { verifyEmail, fetchMe, isLoggedIn, user } = useAuth()
const { sending, cooldown, resend, resendLabel } = useEmailVerification()

const token = computed(() => {
  const raw = route.query.token
  return typeof raw === 'string' ? raw : ''
})

type Status = 'verifying' | 'success' | 'failed'
const status = ref<Status>('verifying')

onMounted(async () => {
  if (!token.value) {
    status.value = 'failed'
    return
  }
  try {
    await verifyEmail(token.value)
    status.value = 'success'
    // Refresh the profile so `emailVerifiedAt` — and the badge that reads it —
    // reflects the stamp the backend just wrote.
    if (isLoggedIn.value) await fetchMe()
  } catch {
    // The only failure this endpoint returns is an unusable token, and its
    // message is English-only — show the localized copy instead.
    status.value = 'failed'
  }
})
</script>

<template>
  <div class="flex flex-col">
    <div v-if="status === 'verifying'" class="text-muted text-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin w-6 h-6 mb-3" />
      <p>{{ $t('pages.verifyEmail.verifying') }}</p>
    </div>

    <template v-else-if="status === 'success'">
      <div class="mb-8">
        <UIcon name="i-lucide-circle-check-big" class="w-10 h-10 text-success mb-3" />
        <h1 class="text-highlighted text-3xl font-bold mb-1">
          {{ $t('pages.verifyEmail.successTitle') }}
        </h1>
        <p class="text-muted">
          {{ user?.email
            ? $t('pages.verifyEmail.successDescriptionFor', { email: user.email })
            : $t('pages.verifyEmail.successDescription') }}
        </p>
      </div>
      <UButton
        :to="isLoggedIn ? '/' : '/auth/login'"
        :label="isLoggedIn ? $t('pages.verifyEmail.continue') : $t('auth.login')"
        block
      />
    </template>

    <template v-else>
      <div class="mb-8">
        <UIcon name="i-lucide-circle-alert" class="w-10 h-10 text-error mb-3" />
        <h1 class="text-highlighted text-3xl font-bold mb-1">
          {{ $t('pages.verifyEmail.failedTitle') }}
        </h1>
        <p class="text-muted">
          {{ $t('pages.verifyEmail.failedDescription') }}
        </p>
      </div>

      <UButton
        v-if="isLoggedIn"
        :label="resendLabel"
        :loading="sending"
        :disabled="cooldown > 0"
        block
        @click="resend"
      />
      <template v-else>
        <p class="text-sm text-muted mb-3">
          {{ $t('pages.verifyEmail.signInToResend') }}
        </p>
        <UButton to="/auth/login" :label="$t('auth.login')" block />
      </template>
    </template>
  </div>
</template>
