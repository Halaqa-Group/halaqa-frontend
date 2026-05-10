<script setup lang="ts">
import type { NavigationMenuItem, BreadcrumbItem } from '@nuxt/ui'

const { t } = useI18n()
const { user, activeRole } = useAuth()
const { initializeHalaqa } = useGlobalHalaqa()
const route = useRoute()
const localePath = useLocalePath()

const open = ref(false)
const isCollapsed = ref(false)

const links = computed<NavigationMenuItem[][]>(() => {
  if (activeRole.value === 'parent') {
    return [[
      { label: t('nav.parentOverview'), icon: 'i-lucide-heart-handshake', to: '/parent' }
    ]]
  }

  const mainLinks: NavigationMenuItem[] = [
    { label: t('nav.home'), icon: 'i-lucide-layout-grid', to: '/' }
  ]

  if (activeRole.value === 'principal') {
    mainLinks.push(
      { label: t('nav.halaqat'), icon: 'i-lucide-building-2', to: '/halaqat' },
      { label: t('nav.users'), icon: 'i-lucide-users-round', to: '/users' }
    )
  }

  mainLinks.push(
    { label: t('nav.students'), icon: 'i-lucide-users', to: '/students' },
    { label: t('nav.attendance'), icon: 'i-lucide-user-check', to: '/attendance' },
    { label: t('nav.achievements'), icon: 'i-lucide-award', to: '/achievements' },
    { label: t('nav.planner'), icon: 'i-lucide-book-open', to: '/planner' }
  )

  if (activeRole.value !== 'teacher') {
    mainLinks.push({ label: t('nav.analytics'), icon: 'i-lucide-bar-chart-3', to: '/analytics' })
  }

  return [mainLinks]
})

const breadcrumb = computed<BreadcrumbItem[]>(() => {
  const items = route.meta?.breadcrumb as { label: string, to?: string }[] | undefined

  if (!items) return []

  return items.map(item => ({
    label: $t(item.label),
    ...(item?.to ? { to: localePath(item.to) } : {})
  }))
})

const roleOptions = computed(() => user.value?.roles?.map(role => ({
  label: t(`roles.${role}`),
  value: role
})))

const hasMultipleRoles = computed(() => user.value?.roles?.length > 1)

watch(activeRole, async (role) => {
  if (!role) return

  await refreshNuxtData()

  if (role === 'parent' && route.path !== '/parent') {
    await navigateTo('/parent')
    return
  }

  if (route.path === '/parent' && role !== 'parent') {
    await navigateTo('/')
    return
  }

  if (route.path.startsWith('/halaqat') && role !== 'principal') {
    await navigateTo('/')
  }

  if (route.path.startsWith('/users') && role !== 'principal') {
    await navigateTo('/')
  }

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
        root: 'bg-sidebar-bg min-w-18',
        header: 'px-3',
        body: 'px-3 py-4',
        footer: 'px-3 py-3'
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink :to="localePath('/')" class="flex items-center justify-center w-full py-2">
          <img
            v-if="collapsed"
            src="/images/logo/halqa_icon.svg"
            alt="Halaqa"
            class="h-8 w-auto"
          >
          <img
            v-else
            src="/images/logo/halaqa_logo.png"
            alt="Halaqa Logo"
            class="h-10 w-auto"
          >
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
          class="my-auto"
          :ui="{ link: collapsed ? 'justify-center py-3' : ' py-3' }"
        />

        <UNavigationMenu
          v-if="links[1]?.length"
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
            <USelect
              v-if="hasMultipleRoles"
              v-model="activeRole"
              :items="roleOptions"
              value-key="value"
              class="w-40"
              size="sm"
            />
            <HalaqaMenu class="w-56" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <HalaqaSwitcherModal />
  </UDashboardGroup>
</template>
