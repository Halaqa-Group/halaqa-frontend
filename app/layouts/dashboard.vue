<script setup lang="ts">
const { initializeHalaqa } = useGlobalHalaqa()

// Initialize global halaqa selection on mount
onMounted(async () => {
  await initializeHalaqa()
})
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--color-background);">
    <AppSidebar />
    <div class="flex flex-col min-h-screen ms-[84px]">
      <AppHeader />
      <main class="flex-1 overflow-auto p-8">
        <slot />
      </main>
    </div>

    <!-- Global Halaqa Switcher Modal -->
    <HalaqaSwitcherModal />
  </div>
</template>
