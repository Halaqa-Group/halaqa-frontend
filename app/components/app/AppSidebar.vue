<script setup lang="ts">
const route = useRoute()

const navItems = [
  { to: '/', icon: 'i-lucide-layout-grid', label: 'لوحة التحكم' },
  { to: '/attendance', icon: 'i-lucide-user-check', label: 'الحضور' },
  { to: '/students', icon: 'i-lucide-users', label: 'الطلاب' },
  { to: '/planner', icon: 'i-lucide-book-open', label: 'المخطط' },
  { to: '/analytics', icon: 'i-lucide-bar-chart-3', label: 'التحليلات' }
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <aside
    class="fixed inset-y-0 right-0 z-20 w-[84px] flex flex-col items-center py-4 border-s border-default bg-elevated"
  >
    <!-- Logo -->
    <div class="mb-6 w-10 h-10 rounded-2xl flex items-center justify-center" style="background-color: #EFB0C1;">
      <UIcon name="i-lucide-book" class="w-5 h-5" style="color: #8B3A52;" />
    </div>

    <!-- Nav items -->
    <nav class="flex flex-col items-center gap-1 flex-1 w-full px-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 w-full py-2 rounded-2xl transition-colors no-underline"
        :style="isActive(item.to)
          ? 'background-color: var(--color-surface-container);'
          : ''"
        :class="!isActive(item.to) ? 'hover:bg-[--color-surface-container-low]' : ''"
      >
        <UIcon
          :name="item.icon"
          class="w-5 h-5 transition-colors"
          :style="isActive(item.to)
            ? 'color: var(--color-primary);'
            : 'color: var(--color-on-surface-variant);'"
        />
        <span
          class="text-[9px] font-arabic leading-tight text-center"
          :style="isActive(item.to)
            ? 'color: var(--color-primary);'
            : 'color: var(--color-on-surface-variant);'"
        >{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- Bottom actions -->
    <div class="flex flex-col items-center gap-1 mt-2">
      <button
        class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors hover:bg-[--color-surface-container-low]"
      >
        <UIcon name="i-lucide-settings" class="w-5 h-5" style="color: var(--color-on-surface-variant);" />
      </button>
      <button
        class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors hover:bg-[--color-surface-container-low]"
      >
        <UIcon name="i-lucide-help-circle" class="w-5 h-5" style="color: var(--color-on-surface-variant);" />
      </button>
    </div>
  </aside>
</template>
