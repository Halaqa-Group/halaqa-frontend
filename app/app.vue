<script setup lang="ts">
import { ar, en } from '@nuxt/ui/locale'

const { locale } = useI18n()
const head = useLocaleHead()

const uiLocale = computed(() => (locale.value === 'ar' ? ar : en))
</script>

<template>
  <Html :lang="head.htmlAttrs.lang" :dir="head.htmlAttrs.dir">
    <Body>
      <UApp :locale="uiLocale">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </UApp>
    </Body>
  </Html>
</template>
