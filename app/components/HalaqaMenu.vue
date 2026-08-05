<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { selectedHalaqa, halaqat, selectHalaqa } = useGlobalHalaqa()

const TYPE_ICONS: Record<string, string> = {
  Memorization: 'i-lucide-book-open',
  Tajweed: 'i-lucide-mic',
  Aqeedah: 'i-lucide-book-text'
}

function iconFor(type: string | undefined) {
  return (type && TYPE_ICONS[type]) || 'i-lucide-layers'
}

const hasMultipleHalaqat = computed(() => halaqat.value.length > 1)

const triggerName = computed(() => selectedHalaqa.value?.name ?? 'اختر الحلقة')
const triggerIcon = computed(() => iconFor(selectedHalaqa.value?.type))

const items = computed<DropdownMenuItem[][]>(() => {
  const halaqaItems: DropdownMenuItem[] = halaqat.value.map(h => ({
    label: h.name,
    icon: iconFor(h.type),
    checked: selectedHalaqa.value?.id === h.id,
    type: 'checkbox' as const,
    onSelect: (e: Event) => {
      e.preventDefault()
      selectHalaqa(h)
    }
  }))

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
