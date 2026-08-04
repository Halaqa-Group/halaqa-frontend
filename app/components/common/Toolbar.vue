<script setup lang="ts">
// A single responsive action row for list pages. Leading controls (search,
// filters, view toggles) flow first and wrap onto new lines only when there
// isn't room; trailing actions (Add / Export / …) align to the end on wide
// screens and wrap below on narrow ones. This fills the horizontal space
// instead of stacking one control per line.
//
// The row is full-bleed: it cancels the page body's horizontal `p-4 sm:p-6` so
// its bottom divider spans edge to edge. The space above the toolbar comes from
// the body's (reduced) top padding, which is tuned to match the `pb-3` below.
//
// Usage:
//   <CommonToolbar>
//     <UInput class="flex-1 min-w-40 sm:max-w-xs" ... />   <!-- grows -->
//     <USelect ... />
//     <template #actions>
//       <UButton>Add</UButton>
//     </template>
//   </CommonToolbar>
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 border-b border-default pb-3 -mx-4 w-[calc(100%+2rem)] px-4 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6"
  >
    <slot />
    <div v-if="$slots.actions" class="ms-auto flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
