<script setup lang="ts">
const route = useRoute()

const navItems = [
  { to: '/', icon: 'i-lucide-layout-grid' },
  { to: '/attendance', icon: 'i-lucide-user-check' },
  { to: '/achievements', icon: 'i-lucide-award' },
  { to: '/students', icon: 'i-lucide-users' },
  { to: '/planner', icon: 'i-lucide-book-open' },
  { to: '/analytics', icon: 'i-lucide-bar-chart-3' }
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const activeIndex = computed(() => navItems.findIndex(item => isActive(item.to)))

// Each item is h-12 (48px) + gap-6 (24px) = 72px per step
const indicatorY = computed(() => activeIndex.value * 72)
</script>

<template>
  <aside
    class="fixed inset-y-0 right-0 z-20 w-20 flex flex-col items-center py-8 border-e border-outline-variant"
    style="background-color: #ffffff; box-shadow: -4px 0 24px rgba(128,76,125,0.03);"
  >
    <!-- Logo -->
    <div class="mb-10" style="color: var(--color-primary);">
      <UIcon name="i-lucide-book" class="w-8 h-8" />
    </div>

    <!-- Nav items -->
    <nav class="relative flex flex-col items-center gap-6 flex-1">
      <!-- Sliding background indicator -->
      <div
        class="indicator absolute w-12 h-12 rounded-xl pointer-events-none"
        :style="{
          transform: `translateY(${indicatorY}px)`,
          opacity: activeIndex >= 0 ? 1 : 0
        }"
      />

      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer no-underline"
        :class="!isActive(item.to) ? 'hover:bg-slate-100' : ''"
        :style="isActive(item.to) ? 'color: var(--color-primary);' : 'color: #64748B;'"
      >
        <UIcon
          :name="item.icon"
          class="w-6 h-6 nav-icon"
          :class="{ 'is-active': isActive(item.to) }"
        />
      </NuxtLink>
    </nav>

    <!-- Bottom actions -->
    <div class="flex flex-col items-center gap-6">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-help-circle"
        size="xl"
        class="w-12 h-12 rounded-xl justify-center"
        :ui="{ leadingIcon: 'w-6 h-6' }"
      />
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-settings"
        size="xl"
        class="w-12 h-12 rounded-xl justify-center"
        :ui="{ leadingIcon: 'w-6 h-6' }"
      />
    </div>
  </aside>
</template>

<style scoped>
.indicator {
  background-color: #f6ebf0;
  top: 0;
  transition: transform 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.2s ease;
}

.nav-icon {
  transition: color 0.25s ease;
}

.nav-icon.is-active {
  animation: icon-vibrate 0.5s ease forwards;
}

@keyframes icon-vibrate {
  0%   { transform: scale(0.8)  rotate(0deg);  }
  20%  { transform: scale(1.15) rotate(-12deg); }
  40%  { transform: scale(1.1)  rotate(10deg);  }
  60%  { transform: scale(1.05) rotate(-6deg);  }
  80%  { transform: scale(1.02) rotate(3deg);   }
  100% { transform: scale(1)    rotate(0deg);   }
}
</style>
