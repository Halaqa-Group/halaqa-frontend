<script setup lang="ts">
import type { NuxtError } from '#app'
import * as locales from '@nuxt/ui/locale'

// error.vue renders in place of app.vue when a fatal error is thrown, so it must
// stand on its own: no NuxtLayout wraps it, and html lang/dir + theme-color that
// app.vue normally sets have to be re-applied here.
const props = defineProps<{ error: NuxtError }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const statusCode = computed(() => props.error?.statusCode ?? 500)

// Map known status codes to their visual treatment; anything unmapped falls back
// to the generic "something went wrong" copy and the error tint. Tint classes are
// spelled out in full so Tailwind keeps them (interpolated names get purged).
const errorMap = {
  404: { icon: 'i-lucide-map-pin-off', tint: 'bg-primary/10', iconColor: 'text-primary', key: '404' },
  403: { icon: 'i-lucide-shield-x', tint: 'bg-warning/10', iconColor: 'text-warning', key: '403' },
  500: { icon: 'i-lucide-server-crash', tint: 'bg-error/10', iconColor: 'text-error', key: '500' }
} as const

const generic = { icon: 'i-lucide-triangle-alert', tint: 'bg-error/10', iconColor: 'text-error', key: 'generic' } as const

const config = computed(() => {
  const known = errorMap[statusCode.value as keyof typeof errorMap]
  if (known) return known
  // Treat any other 5xx like a 500; everything else gets the generic treatment.
  if (statusCode.value >= 500) return { ...errorMap[500], key: 'generic' as const }
  return generic
})

const title = computed(() => t(`error.${config.value.key}.title`))
const description = computed(() => t(`error.${config.value.key}.description`))

// clearError tears down the error state; the redirect sends the user back into
// the app shell. 500s also expose a plain reload as a second escape hatch.
const handleGoHome = () => clearError({ redirect: localePath('/') })
const handleTryAgain = () => reloadNuxtApp()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

useHead({
  htmlAttrs: { lang, dir },
  title: computed(() => `${statusCode.value} — ${title.value}`)
})
</script>

<template>
  <UApp :locale="locales[locale]">
    <div class="min-h-dvh flex flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <NuxtLink :to="localePath('/')" class="shrink-0">
        <img src="/images/logo/halaqa_logo.png" alt="Halaqa Logo" class="h-12 w-auto">
      </NuxtLink>

      <div class="flex flex-col items-center gap-4">
        <div class="rounded-full p-4" :class="config.tint">
          <UIcon :name="config.icon" class="size-9" :class="config.iconColor" />
        </div>

        <p class="text-5xl font-bold text-highlighted tabular-nums">
          {{ statusCode }}
        </p>

        <div class="space-y-1.5">
          <p class="text-lg font-semibold text-highlighted">
            {{ title }}
          </p>
          <p class="text-sm text-on-surface-variant max-w-sm mx-auto">
            {{ description }}
          </p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-3">
        <UButton
          color="primary"
          icon="i-lucide-home"
          size="lg"
          @click="handleGoHome"
        >
          {{ t('error.goHome') }}
        </UButton>
        <UButton
          v-if="statusCode >= 500"
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-cw"
          size="lg"
          @click="handleTryAgain"
        >
          {{ t('error.tryAgain') }}
        </UButton>
      </div>
    </div>
  </UApp>
</template>
