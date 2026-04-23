<template>
  <div class="min-h-screen" style="background-color: var(--color-background);">
    <AppSidebar />
    <div class="flex flex-col min-h-screen ms-[84px]">
      <AppHeader />
      <main class="flex-1 overflow-auto p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
