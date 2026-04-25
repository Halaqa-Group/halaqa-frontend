<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { t, locale, setLocale } = useI18n()
const colorMode = useColorMode()
const { user, logout } = useAuth()

const userAvatar = computed(() => ({
  alt: user.value?.name ?? '',
  text: (user.value?.name ?? '?').slice(0, 1).toUpperCase()
}))

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value?.name ?? '',
  avatar: userAvatar.value
}], [{
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
}], [{
  label: t('auth.logout'),
  icon: 'i-lucide-log-out',
  onSelect: () => {
    logout()
  }
}]]))
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
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="collapsed ? 'size-9 p-0' : 'h-9 px-2.5'"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>
