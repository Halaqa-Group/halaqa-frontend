<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()

const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

const toaster = {
  expand: false,
  position: 'top-center'
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
  </UApp>
</template>
