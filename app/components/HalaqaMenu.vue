<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { t } = useI18n()
const { selectedHalaqa, halaqat, viewAllHalaqat, selectHalaqa, selectAllHalaqat } = useGlobalHalaqa()

const TYPE_ICONS: Record<string, string> = {
  Memorization: 'i-lucide-book-open',
  Tajweed: 'i-lucide-mic',
  Aqeedah: 'i-lucide-book-text'
}

function iconFor(type: string | undefined) {
  return (type && TYPE_ICONS[type]) || 'i-lucide-layers'
}

// Only users assigned to more than one halaqa can view them all at once — and
// only they get an interactive dropdown at all (a single-halaqa user has nothing
// to switch between).
const hasMultipleHalaqat = computed(() => halaqat.value.length > 1)

const triggerName = computed(() => {
  if (viewAllHalaqat.value) return t('common.allHalaqat')
  return selectedHalaqa.value?.name ?? t('common.selectHalaqa')
})
const triggerIcon = computed(() =>
  viewAllHalaqat.value ? 'i-lucide-layers' : iconFor(selectedHalaqa.value?.type)
)

const items = computed<DropdownMenuItem[][]>(() => {
  const halaqaItems: DropdownMenuItem[] = halaqat.value.map(h => ({
    label: h.name,
    icon: iconFor(h.type),
    checked: !viewAllHalaqat.value && selectedHalaqa.value?.id === h.id,
    type: 'checkbox' as const,
    // No preventDefault — selecting a halaqa should close the menu.
    onSelect: () => selectHalaqa(h)
  }))

  // "All halaqat" sits above the individual halaqat for anyone with more than one.
  if (hasMultipleHalaqat.value) {
    halaqaItems.unshift({
      label: t('common.allHalaqat'),
      icon: 'i-lucide-layers',
      checked: viewAllHalaqat.value,
      type: 'checkbox' as const,
      onSelect: () => selectAllHalaqat()
    })
  }

  return [halaqaItems]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start', collisionPadding: 12 }"
    :ui="{ content: 'min-w-56' }"
  >
    <UButton
      :icon="triggerIcon"
      :trailing-icon="(!collapsed && hasMultipleHalaqat) ? 'i-lucide-chevron-down' : undefined"
      color="neutral"
      variant="ghost"
      size="sm"
      :square="collapsed"
      class="max-w-full data-[state=open]:bg-elevated"
      :class="[
        collapsed ? 'aspect-square mx-auto' : '',
        !hasMultipleHalaqat && 'pointer-events-none'
      ]"
      :ui="{ trailingIcon: 'text-dimmed size-3.5' }"
    >
      <span v-if="!collapsed" class="text-sm font-medium truncate">{{ triggerName }}</span>
    </UButton>
  </UDropdownMenu>
</template>
