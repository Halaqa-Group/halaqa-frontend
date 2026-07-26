<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  breadcrumb: [{ label: 'pages.profile.title' }]
})

const { t } = useI18n()
const { user, isEmailVerified } = useAuth()

const tab = ref('profile')
const tabs = computed<TabsItem[]>(() => [
  { value: 'profile', label: t('pages.profile.tabs.profile'), icon: 'i-lucide-user' },
  { value: 'security', label: t('pages.profile.tabs.security'), icon: 'i-lucide-shield' },
  { value: 'sessions', label: t('pages.profile.tabs.sessions'), icon: 'i-lucide-monitor' }
])

const avatar = computed(() => ({
  src: user.value?.photoUrl ?? undefined,
  alt: user.value?.name ?? '',
  text: (user.value?.name ?? '?').slice(0, 1).toUpperCase()
}))

const roleLabels = computed(() => (user.value?.roles ?? []).map(r => t(`roles.${r}`, r)))
</script>

<template>
  <div class="max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
    <div class="space-y-1">
      <h2 class="display-lg text-on-surface">
        {{ $t('pages.profile.title') }}
      </h2>
      <p class="text-sm text-on-surface-variant">
        {{ $t('pages.profile.subtitle') }}
      </p>
    </div>

    <div class="flex items-center gap-4 p-4 rounded-2xl bg-elevated">
      <UAvatar v-bind="avatar" size="xl" />
      <div>
        <h3 class="text-lg font-bold text-highlighted">
          {{ user?.name }}
        </h3>
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm text-muted" dir="ltr">
            {{ user?.email }}
          </p>
          <UBadge
            v-if="user?.email"
            :color="isEmailVerified ? 'success' : 'warning'"
            variant="soft"
            size="sm"
            :icon="isEmailVerified ? 'i-lucide-badge-check' : 'i-lucide-badge-alert'"
          >
            {{ isEmailVerified ? $t('pages.profile.email.verified') : $t('pages.profile.email.unverified') }}
          </UBadge>
        </div>
        <div v-if="roleLabels.length" class="flex flex-wrap gap-1.5 mt-2">
          <UBadge v-for="r in roleLabels" :key="r" color="primary" variant="soft" size="sm">
            {{ r }}
          </UBadge>
        </div>
      </div>
    </div>

    <UTabs v-model="tab" :items="tabs" variant="link" class="w-full">
      <template #content="{ item }">
        <ProfileInfoTab v-if="item.value === 'profile'" />
        <ProfilePasswordTab v-else-if="item.value === 'security'" />
        <ProfileSessionsTab v-else-if="item.value === 'sessions'" />
      </template>
    </UTabs>
  </div>
</template>
