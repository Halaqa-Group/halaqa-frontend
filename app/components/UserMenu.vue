<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { t, locale, setLocale } = useI18n()
const colorMode = useColorMode()
const { user, activeRole, logout } = useAuth()
const { $pwa } = useNuxtApp()

const hasMultipleRoles = computed(() => (user.value?.roles?.length ?? 0) > 1)

const userAvatar = computed(() => ({
  src: user.value?.photoUrl ?? undefined,
  alt: user.value?.name ?? '',
  text: (user.value?.name ?? '?').slice(0, 1).toUpperCase(),
  ui: { root: 'rounded-full' }
}))

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value?.name ?? '',
  avatar: userAvatar.value
}], [
  ...(hasMultipleRoles.value
    ? [{
        label: t(`roles.${activeRole.value}`),
        icon: 'i-lucide-user-cog',
        children: (user.value?.roles ?? []).map(role => ({
          label: t(`roles.${role}`),
          type: 'checkbox' as const,
          checked: activeRole.value === role,
          onSelect(e: Event) {
            e.preventDefault()
            if (activeRole.value === role) return
            activeRole.value = role
            // Reload so every page refetches its data scoped to the new role.
            reloadNuxtApp({ persistState: false })
          }
        }))
      }]
    : []),
  {
    label: t('nav.profile'),
    icon: 'i-lucide-user',
    to: '/profile'
  }, {
    label: locale.value === 'ar' ? 'English' : 'العربية',
    icon: 'i-lucide-languages',
    onSelect: (e: Event) => {
      e.preventDefault()
      setLocale(locale.value === 'ar' ? 'en' : 'ar')
    }
  }, {
    label: 'Appearance',
    icon: 'i-lucide-sun-moon',
    children: [{
      label: 'Light',
      icon: 'i-lucide-sun',
      type: 'checkbox',
      checked: colorMode.value === 'light',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'light'
      }
    }, {
      label: 'Dark',
      icon: 'i-lucide-moon',
      type: 'checkbox',
      checked: colorMode.value === 'dark',
      onSelect(e: Event) {
        e.preventDefault()
        colorMode.preference = 'dark'
      }
    }]
  }], [
  ...($pwa?.showInstallPrompt && !$pwa?.isPWAInstalled
    ? [{
        label: t('pwa.install'),
        icon: 'i-lucide-download',
        onSelect: (e: Event) => {
          e.preventDefault()
          $pwa?.install()
        }
      }]
    : []),
  {
    label: t('auth.logout'),
    icon: 'i-lucide-log-out',
    onSelect: () => {
      logout()
    }
  }
]]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :avatar="userAvatar"
      :label="collapsed ? undefined : (user?.name ?? '')"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :class="[
        'data-[state=open]:bg-elevated',
        collapsed && 'size-11 mx-auto p-0 justify-center rounded-full hover:bg-transparent'
      ]"
      :ui="{
        trailingIcon: 'text-dimmed',
        leadingAvatar: collapsed ? 'size-full rounded-full' : ''
      }"
    />
  </UDropdownMenu>
</template>
