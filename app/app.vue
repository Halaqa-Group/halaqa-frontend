<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()
const colorMode = useColorMode()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

// Follows the app's light/dark toggle so the browser/status-bar chrome (and the
// iOS strip via --color-background) match the theme instead of staying white.
// Values mirror --color-background in app/assets/css/main.css.
const themeColor = computed(() => (colorMode.value === 'dark' ? '#171717' : '#ffffff'))

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
  // Overrides the static theme-color in nuxt.config so it tracks light/dark.
  meta: [
    { name: 'theme-color', content: themeColor }
  ],
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
