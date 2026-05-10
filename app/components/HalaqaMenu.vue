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
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :icon="triggerIcon"
      :trailing-icon="(!collapsed && hasMultipleHalaqat) ? 'i-lucide-chevrons-up-down' : undefined"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[
        collapsed ? 'aspect-square mx-auto' : 'h-auto py-1.5',
        !hasMultipleHalaqat && 'pointer-events-none'
      ]"
      :ui="{ trailingIcon: 'text-dimmed' }"
    >
      <span v-if="!collapsed" class="flex flex-col items-start text-start min-w-0 flex-1 leading-tight">
        <span class="text-[11px] text-dimmed">حلقة</span>
        <span class="text-sm font-semibold truncate w-full">{{ triggerName }}</span>
      </span>
    </UButton>
  </UDropdownMenu>
</template>
