<script setup lang="ts">
import type { SystemAlert } from '~/types'
import { alertColor, alertIcon } from '~/utils/daily-report'

// Renders the report's `system_alerts` as badges. `compact` shows icon-only
// chips (for a dense table cell); the full form shows the message text.
withDefaults(defineProps<{
  alerts: SystemAlert[]
  compact?: boolean
}>(), { compact: false })
</script>

<template>
  <div v-if="alerts.length" class="flex flex-wrap items-center gap-1">
    <UBadge
      v-for="(alert, i) in alerts"
      :key="`${alert.code}-${i}`"
      :color="alertColor(alert.severity)"
      variant="subtle"
      size="sm"
      :icon="alertIcon(alert.severity)"
      :label="compact ? undefined : alert.message"
      :title="alert.message"
      :aria-label="alert.message"
    />
  </div>
</template>
