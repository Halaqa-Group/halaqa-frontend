const RESEND_COOLDOWN_SECONDS = 60

/**
 * Resend-verification state for the profile card and the verify-email page.
 * The backend puts no throttle on POST /auth/verify-email/request, so the
 * cooldown here is what stops a user from hammering their own inbox.
 */
export function useEmailVerification() {
  const { t } = useI18n()
  const toast = useToast()
  const { requestEmailVerification } = useAuth()
  const apiError = useApiError()

  const sending = ref(false)
  const cooldown = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function stopTimer() {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  function startCooldown() {
    cooldown.value = RESEND_COOLDOWN_SECONDS
    stopTimer()
    timer = setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0) stopTimer()
    }, 1000)
  }

  async function resend(): Promise<void> {
    if (sending.value || cooldown.value > 0) return
    sending.value = true
    try {
      await requestEmailVerification()
      toast.add({ title: t('pages.verifyEmail.resentToast'), color: 'success' })
      startCooldown()
    } catch (e: unknown) {
      toast.add({ title: apiError.format(e, t('auth.genericError')), color: 'error' })
    } finally {
      sending.value = false
    }
  }

  const resendLabel = computed(() => cooldown.value > 0
    ? t('pages.verifyEmail.resendIn', { seconds: cooldown.value })
    : t('pages.verifyEmail.resend'))

  onUnmounted(stopTimer)

  return { sending, cooldown, resend, resendLabel }
}
