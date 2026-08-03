<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  links: NavigationMenuItem[]
}>()

const { t } = useI18n()
const route = useRoute()

const isMoreOpen = ref(false)

// Keep the floating bar readable: at most four primary destinations sit on the
// bar, everything else lives behind the "More" drawer.
const MAX_PRIMARY = 4
const primaryLinks = computed(() => props.links.slice(0, MAX_PRIMARY))
const moreLinks = computed(() => props.links.slice(MAX_PRIMARY))

function isActive(item: NavigationMenuItem): boolean {
  const to = typeof item.to === 'string' ? item.to : ''
  if (!to) return false
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

const isMoreActive = computed(() => moreLinks.value.some(isActive))

// Close the drawer whenever navigation lands somewhere new.
watch(() => route.fullPath, () => {
  isMoreOpen.value = false
})
</script>

<template>
  <nav
    class="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none"
  >
    <div
      class="pointer-events-auto mx-3 rounded-2xl border border-sidebar-border bg-sidebar-bg/95 shadow-lg backdrop-blur-md"
      style="margin-bottom: max(0.75rem, calc(env(safe-area-inset-bottom) - 1.25rem))"
    >
      <ul class="grid grid-flow-col auto-cols-fr">
        <li
          v-for="link in primaryLinks"
          :key="link.to as string"
        >
          <NuxtLink
            :to="link.to"
            class="flex flex-col items-center justify-center gap-1 py-2.5 text-muted transition-colors"
            :class="isActive(link) ? 'text-primary' : 'hover:text-default'"
          >
            <span
              class="flex items-center justify-center size-9 rounded-xl transition-colors"
              :class="isActive(link) ? 'bg-primary/10' : ''"
            >
              <UIcon :name="link.icon as string" class="size-5" />
            </span>
            <span class="text-[10px] font-medium leading-none truncate max-w-14">
              {{ link.label }}
            </span>
          </NuxtLink>
        </li>

        <li>
          <button
            type="button"
            class="flex flex-col items-center justify-center gap-1 py-2.5 w-full text-muted transition-colors"
            :class="isMoreActive || isMoreOpen ? 'text-primary' : 'hover:text-default'"
            @click="isMoreOpen = true"
          >
            <span
              class="flex items-center justify-center size-9 rounded-xl transition-colors"
              :class="isMoreActive || isMoreOpen ? 'bg-primary/10' : ''"
            >
              <UIcon name="i-lucide-menu" class="size-5" />
            </span>
            <span class="text-[10px] font-medium leading-none">
              {{ t('nav.more') }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </nav>

  <UDrawer v-model:open="isMoreOpen" :title="t('nav.menu')">
    <template #body>
      <div class="pb-2" style="padding-bottom: env(safe-area-inset-bottom)">
        <ul v-if="moreLinks.length" class="grid grid-cols-4 gap-2">
          <li
            v-for="link in moreLinks"
            :key="link.to as string"
          >
            <NuxtLink
              :to="link.to"
              class="flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-center transition-colors"
              :class="isActive(link) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated hover:text-default'"
            >
              <UIcon :name="link.icon as string" class="size-6" />
              <span class="text-xs font-medium leading-tight line-clamp-2">
                {{ link.label }}
              </span>
            </NuxtLink>
          </li>
        </ul>

        <USeparator v-if="moreLinks.length" class="my-4" />

        <UserMenu />
      </div>
    </template>
  </UDrawer>
</template>
