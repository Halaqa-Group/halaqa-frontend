<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <div class="grid lg:grid-cols-2 min-h-screen">
    <div class="flex flex-col px-4 sm:px-6 py-6">
      <div class="flex-1 flex flex-col gap-y-15 w-full max-w-sm mx-auto">
        <div class="shrink-0">
          <NuxtLink :to="localePath('/auth/login')" class="flex items-center justify-center py-6">
            <img src="/images/logo/halaqa_logo.png" alt="Halaqa Logo" class="max-w-32" />
          </NuxtLink>
        </div>
        <div class="flex-1 flex flex-col justify-center">
          <slot />
        </div>
        <div class="shrink-0">
          <CommonLanguageToggle />
        </div>
      </div>
    </div>
    <div class="relative hidden lg:flex items-center justify-center bg-linear-to-br from-primary-100 via-primary-300 to-secondary-100">
      <div class="absolute inset-0 bg-white/60 backdrop-blur-sm" />
      <div class="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <img src="/images/logo/halaqa_logo.png" alt="Halaqa Logo" class="w-52 h-auto mb-6" />
        <div class="text-2xl font-semibold text-primary-800 text-center max-w-md px-6 mb-2">
          مرحبًا بكم في منصة حلقة<br />
          <span class="text-primary-600">تعلم، أنجز، وارتقِ مع مجتمعك</span>
        </div>
      </div>
    </div>
  </div>
</template>
