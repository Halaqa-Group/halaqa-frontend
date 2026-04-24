<script setup lang="ts">
const { initializeHalaqa } = useGlobalHalaqa()

// Initialize global halaqa selection on mount
onMounted(async () => {
  await initializeHalaqa()
})
</script>

<template>
  <div class="h-screen overflow-hidden flex" style="background-color: var(--color-background);">
    <AppSidebar />
    <div class="flex flex-col flex-1 min-w-0 ms-[84px] h-screen">
      <AppHeader />
      <main class="flex-1 overflow-y-auto p-8" style="direction: rtl;">
        <slot />
      </main>
    </div>

    <!-- Global Halaqa Switcher Modal -->
    <HalaqaSwitcherModal />
  </div>
</template>
