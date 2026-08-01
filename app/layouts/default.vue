<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const { activeRole } = useAuth()
const { isParent, canViewHalaqat, canManageUsers, canViewCalendar } = usePermissions()
const { initializeHalaqa, isHalaqaScoped } = useGlobalHalaqa()
const route = useRoute()
const localePath = useLocalePath()

const open = ref(false)
const isCollapsed = ref(false)

const links = computed<NavigationMenuItem[][]>(() => {
  if (isParent.value) {
    return [[
      { label: t('nav.parentOverview'), icon: 'i-lucide-heart-handshake', to: '/parent' }
    ]]
  }

  const mainLinks: NavigationMenuItem[] = [
    { label: t('nav.home'), icon: 'i-lucide-home', to: '/' }
  ]

  // GET /halaqat is scoped server-side: supervisors and teachers see only their
  // own, and the page itself hides the writes they cannot perform.
  if (canViewHalaqat.value) {
    mainLinks.push({
      label: t('nav.halaqat'),
      icon: 'i-lucide-building-2',
      to: '/halaqat',
      active: route.path === '/halaqat' || route.path.startsWith('/halaqat/')
    })
  }

  if (canManageUsers.value) {
    mainLinks.push({ label: t('nav.users'), icon: 'i-lucide-users-round', to: '/users' })
  }

  mainLinks.push(
    { label: t('nav.students'), icon: 'i-lucide-graduation-cap', to: '/students' },
    { label: t('nav.attendance'), icon: 'i-lucide-user-check', to: '/attendance' },
    { label: t('nav.dailyReport'), icon: 'i-lucide-clipboard-check', to: '/daily-report' },
    { label: t('nav.achievements'), icon: 'i-lucide-award', to: '/achievements' },
    { label: t('nav.planner'), icon: 'i-lucide-book-open', to: '/planner' }
  )

  // Analytics nav link hidden for now — restore this block to bring it back.
  // if (activeRole.value !== 'teacher') {
  //   mainLinks.push({ label: t('nav.analytics'), icon: 'i-lucide-bar-chart-3', to: '/analytics' })
  // }

  // GET /schedules and /holidays are open to all staff; writes are admin-only
  // and the page gates them.
  if (canViewCalendar.value) {
    mainLinks.push({ label: t('nav.schoolCalendar'), icon: 'i-lucide-calendar-days', to: '/school-calendar' })
  }

  return [mainLinks]
})

watch(activeRole, async (role) => {
  if (!role) return

  await refreshNuxtData()
  // Roles differ in how they scope: re-resolve so a teacher's pinned halaqa does
  // not leak into an unscoped principal view (and vice versa).
  await initializeHalaqa()

  if (role === 'parent' && route.path !== '/parent') {
    await navigateTo('/parent')
    return
  }

  if (route.path === '/parent' && role !== 'parent') {
    await navigateTo('/')
    return
  }

  if (route.path.startsWith('/halaqat') && !canViewHalaqat.value) {
    await navigateTo('/')
  }

  if (route.path.startsWith('/users') && !canManageUsers.value) {
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
            src="/images/logo/favicon.svg"
            alt="Halaqa"
            class="h-9 w-auto"
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
          :ui="{ link: collapsed ? 'justify-center size-11 mx-auto p-0 rounded-md' : 'py-3 rounded-md' }"
        />

        <UNavigationMenu
          v-if="links[1]?.length"
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
          :ui="{ link: collapsed ? 'justify-center size-11 mx-auto p-0 rounded-md' : 'py-3 rounded-md' }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main" :ui="{ body: 'max-lg:pb-24' }">
      <template #header>
        <UDashboardNavbar :toggle="false" :ui="{ right: 'gap-3' }">
          <template #left>
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <UDashboardSidebarCollapse
                class="max-lg:hidden"
                :icon="isCollapsed ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
              />
              <HalaqaMenu v-if="isHalaqaScoped" class="min-w-0 flex-1 sm:flex-none sm:w-56" />
            </div>
          </template>

          <template #right>
            <CommonConnectionStatus />
            <CommonOfflineManager />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <CommonOfflineBanner />
        <slot />
      </template>
    </UDashboardPanel>

    <MobileBottomNav :links="links[0] ?? []" />
  </UDashboardGroup>
</template>
