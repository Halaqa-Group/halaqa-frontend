<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t, locale, setLocale } = useI18n()
const { user } = useAuth()
const { initializeHalaqa } = useGlobalHalaqa()
const { isNotificationsSlideoverOpen } = useDashboard()

const open = ref(false)

const links = computed<NavigationMenuItem[][]>(() => [[
  { label: t('nav.home'), icon: 'i-lucide-layout-grid', to: '/' },
  { label: t('nav.attendance'), icon: 'i-lucide-user-check', to: '/attendance' },
  { label: t('nav.achievements'), icon: 'i-lucide-award', to: '/achievements' },
  { label: t('nav.students'), icon: 'i-lucide-users', to: '/students' },
  { label: t('nav.planner'), icon: 'i-lucide-book-open', to: '/planner' },
  { label: t('nav.analytics'), icon: 'i-lucide-bar-chart-3', to: '/analytics' }
], [
  { label: t('nav.tasks'), icon: 'i-lucide-list-checks', to: '/tasks' }
]])

async function toggleLocale() {
  await setLocale(locale.value === 'ar' ? 'en' : 'ar')
}

onMounted(async () => {
  await initializeHalaqa()
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{
        header: 'border-b border-default',
        footer: 'lg:border-t lg:border-default'
      }"
    >
      <template #header="{ collapsed }">
        <HalaqaMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main">
      <template #header>
        <UDashboardNavbar :title="user?.school_name ?? ''" :ui="{ right: 'gap-3' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              :label="locale === 'ar' ? 'EN' : 'ع'"
              :aria-label="locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'"
              class="font-bold min-w-10 justify-center"
              @click="toggleLocale"
            />

            <UTooltip text="Notifications" :shortcuts="['N']">
              <UButton
                color="neutral"
                variant="ghost"
                square
                @click="isNotificationsSlideoverOpen = true"
              >
                <UChip color="error" inset>
                  <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
                </UChip>
              </UButton>
            </UTooltip>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <HalaqaSwitcherModal />
    <HalaqaCurtain />
  </UDashboardGroup>
</template>
