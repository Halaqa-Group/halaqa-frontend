<script setup lang="ts">
import type { NavigationMenuItem, BreadcrumbItem } from '@nuxt/ui'

const { t } = useI18n()
const { user } = useAuth()
const { initializeHalaqa } = useGlobalHalaqa()
const { isNotificationsSlideoverOpen } = useDashboard()
const route = useRoute()
const localePath = useLocalePath()

const open = ref(false)
const isCollapsed = ref(false)

const isPrincipal = computed(() => user.value?.roles.includes('principal') ?? false)

const links = computed<NavigationMenuItem[][]>(() => {
  const main: NavigationMenuItem[] = [
    { label: t('nav.home'), icon: 'i-lucide-layout-grid', to: '/' },
    { label: t('nav.attendance'), icon: 'i-lucide-user-check', to: '/attendance' },
    { label: t('nav.achievements'), icon: 'i-lucide-award', to: '/achievements' },
    { label: t('nav.students'), icon: 'i-lucide-users', to: '/students' },
    { label: t('nav.planner'), icon: 'i-lucide-book-open', to: '/planner' },
    { label: t('nav.analytics'), icon: 'i-lucide-bar-chart-3', to: '/analytics' }
  ]
  const bottom: NavigationMenuItem[] = []
  if (isPrincipal.value) {
    bottom.push({ label: t('nav.users'), icon: 'i-lucide-users-round', to: '/users' })
  }
  return [main, bottom]
})

const breadcrumb = computed<BreadcrumbItem[]>(() => {
  const items = route.meta?.breadcrumb as { label: string, to?: string }[] | undefined

  if (!items) return []

  return items.map(item => ({
    label: $t(item.label),
    ...(item?.to ? { to: localePath(item.to) } : {})
  }))
})

onMounted(async () => {
  await initializeHalaqa()
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      v-model:collapsed="isCollapsed"
      collapsible
      resizable
      :ui="{
        root: 'bg-sidebar-bg border-e-0 min-w-18',
        header: 'border-b border-sidebar-border px-3',
        body: 'px-3 py-4',
        footer: 'lg:border-t lg:border-sidebar-border px-3 py-3'
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
          :ui="{ link: collapsed ? 'justify-center py-3' : ' py-3' }"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
          :ui="{ link: collapsed ? 'justify-center py-3' : ' py-3' }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main">
      <template #header>
        <UDashboardNavbar :ui="{ right: 'gap-3' }">
          <template #left>
            <div class="flex items-center gap-3">
              <UDashboardSidebarCollapse :icon="isCollapsed ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'" />
              <div>
                <h2 v-if="user?.name" class="font-bold text-base mb-1">
                  {{ user.name }}
                </h2>
                <UBreadcrumb :items="breadcrumb" :ui="{ linkLabel: 'text-xs' }" />
              </div>
            </div>
          </template>

          <template #right>
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
