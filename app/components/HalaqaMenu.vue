<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const { selectedHalaqa, viewAllHalaqat, halaqat, selectHalaqa, selectAllHalaqat, openModal } = useGlobalHalaqa()
const { activeRole } = useAuth()

const TYPE_ICONS: Record<string, string> = {
  Memorization: 'i-lucide-book-open',
  Tajweed: 'i-lucide-mic',
  Aqeedah: 'i-lucide-book-text'
}

const ALL_HALAQAT_ICON = 'i-lucide-layers-3'

function iconFor(type: string | undefined) {
  return (type && TYPE_ICONS[type]) || 'i-lucide-layers'
}

const canViewAllHalaqat = computed(() => activeRole.value === 'principal')

const triggerLabel = computed(() => {
  if (viewAllHalaqat.value) return 'كل الحلقات'
  return selectedHalaqa.value?.name ?? 'اختر الحلقة'
})
const triggerIcon = computed(() => {
  if (viewAllHalaqat.value) return ALL_HALAQAT_ICON
  return iconFor(selectedHalaqa.value?.type)
})

const items = computed<DropdownMenuItem[][]>(() => {
  const halaqaItems: DropdownMenuItem[] = halaqat.value.map(h => ({
    label: h.name,
    icon: iconFor(h.type),
    checked: !viewAllHalaqat.value && selectedHalaqa.value?.id === h.id,
    type: 'checkbox' as const,
    onSelect: (e: Event) => {
      e.preventDefault()
      selectHalaqa(h)
    }
  }))

  if (canViewAllHalaqat.value) {
    halaqaItems.unshift({
      label: 'كل الحلقات',
      icon: ALL_HALAQAT_ICON,
      checked: viewAllHalaqat.value,
      type: 'checkbox' as const,
      onSelect: (e: Event) => {
        e.preventDefault()
        selectAllHalaqat()
      }
    })
  }

  return [
    halaqaItems,
    [{
      label: 'إدارة الحلقات',
      icon: 'i-lucide-cog',
      onSelect: () => openModal()
    }]
  ]
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
      :label="collapsed ? undefined : triggerLabel"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="collapsed && 'aspect-square mx-auto'"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>
