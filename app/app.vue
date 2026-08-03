<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

const toaster = {
  expand: false,
  position: 'top-center',
  // Keep top-anchored toasts below the iOS notch/status bar (viewport-fit=cover
  // lets them render edge-to-edge otherwise). Inset is 0 on Android/desktop.
  ui: { viewport: 'top-[calc(env(safe-area-inset-top)+1rem)]' }
} as const

useHead({
  htmlAttrs: {
    lang,
    dir
  },
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${$t('app.name')} - ${titleChunk}` : $t('app.name')
  }
})
</script>

<template>
  <UApp :toaster="toaster" :locale="locales[locale]">
    <NuxtLoadingIndicator color="var(--ui-primary)" :height="2" />
    <UMain class="min-h-screen flex flex-col">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>
    <CommonPwaPrompt />
  </UApp>
</template>
