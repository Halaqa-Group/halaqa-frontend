<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const { user, logout } = useAuth()
const { selectedHalaqaName, openModal } = useGlobalHalaqa()

async function toggleLocale() {
  await setLocale(locale.value === 'ar' ? 'en' : 'ar')
}

const userMenuItems = computed(() => [[
  { label: user.value?.name ?? '', icon: 'i-lucide-user', disabled: true },
  { label: t('auth.logout'), icon: 'i-lucide-log-out', onSelect: logout }
]])
</script>

<template>
  <header
    class="relative flex items-center px-8 py-4 shrink-0"
    style="background-color: var(--color-surface-container-lowest); border-bottom: 1px solid var(--color-outline-variant);"
  >
    <!-- School name -->
    <span class="text-xl font-bold" style="color: var(--color-on-surface);">{{ user?.school_name ?? '...' }}</span>

    <!-- Halaqa selector — absolutely centered -->
    <UButton
      variant="soft"
      color="primary"
      icon="i-lucide-layers"
      :label="selectedHalaqaName"
      class="absolute left-1/2 -translate-x-1/2 gap-2 px-4 py-2 rounded-2xl text-sm font-semibold hover:opacity-80"
      style="background-color: var(--color-primary-container);"
      @click="openModal"
    />

    <!-- Context actions -->
    <div class="flex items-center gap-3 ms-auto">
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        :label="locale === 'ar' ? 'EN' : 'ع'"
        :aria-label="locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'"
        class="font-bold min-w-10 justify-center"
        @click="toggleLocale"
      />
      <div class="relative">
        <UButton variant="ghost" color="neutral" icon="i-lucide-bell" />
        <span class="absolute top-1 end-1 w-2 h-2 rounded-full bg-[#EFB0C1]" />
      </div>
      <UDropdownMenu :items="userMenuItems">
        <UButton variant="ghost" color="neutral" icon="i-lucide-user-circle" />
      </UDropdownMenu>
    </div>
  </header>
</template>
