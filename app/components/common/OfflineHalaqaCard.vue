<script setup lang="ts">
import { formatTimestamp } from '~/utils/date'
// Deliberately caches halaqat's students + plans (+ the lessons' Mushaf pages)
// for offline recording. When the teacher has more than one halaqa, they pick
// which ones to save (one, several, or all) via a multi-select; each row shows
// whether it's already available offline and when it was last refreshed.
import { useOnline } from '@vueuse/core'

const { t, locale } = useI18n()
const online = useOnline()
const { selectedHalaqaId, halaqat } = useGlobalHalaqa()
const {
  done, total, progress, isCaching, cachingHalaqaId, batchIndex, batchCount,
  makeMultipleAvailableOffline, lastCachedAt
} = useHalaqaOfflineCache()

const hasMultiple = computed(() => halaqat.value.length > 1)

// Which halaqat the user has chosen to make available. Defaults to the one
// currently selected in the navbar; when there's only one halaqa it's implicit.
const selectedIds = ref<number[]>([])

watchEffect(() => {
  if (!hasMultiple.value) {
    selectedIds.value = halaqat.value[0] ? [halaqat.value[0].id] : []
    return
  }
  // Seed once from the navbar selection, then leave the user's picks alone.
  if (selectedIds.value.length === 0 && selectedHalaqaId.value != null) {
    selectedIds.value = [selectedHalaqaId.value]
  }
})

// Bump on each cache run so the per-row "cached at" labels recompute (the
// timestamps live in localStorage, outside Vue's reactivity).
const cacheVersion = ref(0)
watch(() => cachingHalaqaId.value, (v, prev) => {
  if (prev != null && v == null) cacheVersion.value++
})

const items = computed(() => {
  // Touch cacheVersion so the cached flags refresh after a run.
  void cacheVersion.value
  return halaqat.value.map(h => ({
    label: h.name,
    value: h.id,
    cached: lastCachedAt(h.id) != null
  }))
})

const allSelected = computed(() =>
  halaqat.value.length > 0 && selectedIds.value.length === halaqat.value.length
)

function toggleAll() {
  selectedIds.value = allSelected.value ? [] : halaqat.value.map(h => h.id)
}

function cachedLabel(id: number): string | null {
  // Touch cacheVersion so this recomputes after a run.
  void cacheVersion.value
  const at = lastCachedAt(id)
  if (!at) return null
  return formatTimestamp(at, locale.value)
}

// Rows to render beneath the picker: the chosen halaqat, with live status.
const chosen = computed(() =>
  selectedIds.value
    .map(id => halaqat.value.find(h => h.id === id))
    .filter((h): h is NonNullable<typeof h> => h != null)
)

function rowState(id: number): 'caching' | 'cached' | 'pending' {
  if (isCaching.value && cachingHalaqaId.value === id) return 'caching'
  void cacheVersion.value
  return lastCachedAt(id) != null ? 'cached' : 'pending'
}

const statusText = computed(() => {
  if (isCaching.value) {
    if (batchCount.value > 1) return t('pwa.offlineHalaqaBatchProgress', { index: batchIndex.value, count: batchCount.value })
    return t('pwa.offlineHalaqaCaching', { done: done.value, total: total.value })
  }
  if (!online.value) return t('pwa.offlineHalaqaNeedsConnection')
  return t('pwa.offlineHalaqaDescription')
})

const cacheLabel = computed(() => {
  const n = selectedIds.value.length
  if (n <= 1) return t('pwa.offlineHalaqaCache')
  return t('pwa.offlineHalaqaCacheCount', { count: n })
})

async function onCache() {
  if (selectedIds.value.length === 0) return
  await makeMultipleAvailableOffline([...selectedIds.value])
}
</script>

<template>
  <div class="p-4 rounded-2xl bg-elevated space-y-3">
    <div class="flex items-start gap-3">
      <div class="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-users" class="size-5 text-primary" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold text-highlighted">
          {{ $t('pwa.offlineHalaqaTitle') }}
        </h3>
        <p class="text-sm text-on-surface-variant mt-0.5">
          {{ statusText }}
        </p>
      </div>
    </div>

    <!-- Picker: only when the teacher has more than one halaqa to choose from. -->
    <div v-if="hasMultiple" class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ $t('pwa.offlineHalaqaSelectLabel') }}
        </span>
        <UButton
          variant="link"
          size="xs"
          class="p-0"
          :label="allSelected ? $t('pwa.offlineHalaqaClearSelection') : $t('pwa.offlineHalaqaSelectAll')"
          @click="toggleAll"
        />
      </div>
      <USelectMenu
        v-model="selectedIds"
        :items="items"
        value-key="value"
        multiple
        :disabled="isCaching"
        :placeholder="$t('pwa.offlineHalaqaSelectPlaceholder')"
        :search-input="{ placeholder: $t('common.search') }"
        class="w-full"
      >
        <template #default>
          <span v-if="selectedIds.length === 0" class="text-dimmed">
            {{ $t('pwa.offlineHalaqaSelectPlaceholder') }}
          </span>
          <span v-else-if="allSelected">
            {{ $t('pwa.offlineHalaqaAllSelected') }}
          </span>
          <span v-else>
            {{ $t('pwa.offlineHalaqaCountSelected', { count: selectedIds.length }) }}
          </span>
        </template>
        <template #item-trailing="{ item }">
          <UIcon
            v-if="(item as { cached: boolean }).cached"
            name="i-lucide-circle-check"
            class="size-4 text-success"
          />
        </template>
      </USelectMenu>
    </div>

    <UProgress v-if="isCaching" :model-value="progress" size="sm" />

    <!-- Status list of the chosen halaqat. -->
    <ul v-if="chosen.length" class="space-y-1.5">
      <li
        v-for="h in chosen"
        :key="h.id"
        class="flex items-center gap-2 text-sm"
      >
        <UIcon
          v-if="rowState(h.id) === 'caching'"
          name="i-lucide-loader-circle"
          class="size-4 text-primary animate-spin shrink-0"
        />
        <UIcon
          v-else-if="rowState(h.id) === 'cached'"
          name="i-lucide-circle-check"
          class="size-4 text-success shrink-0"
        />
        <UIcon
          v-else
          name="i-lucide-circle-dashed"
          class="size-4 text-dimmed shrink-0"
        />
        <span class="min-w-0 flex-1 truncate text-highlighted">{{ h.name }}</span>
        <span class="text-xs text-on-surface-variant shrink-0">
          <template v-if="rowState(h.id) === 'caching'">{{ $t('pwa.offlineHalaqaCachingShort') }}</template>
          <template v-else-if="cachedLabel(h.id)">{{ cachedLabel(h.id) }}</template>
          <template v-else>{{ $t('pwa.offlineHalaqaNotCached') }}</template>
        </span>
      </li>
    </ul>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        icon="i-lucide-cloud-download"
        size="sm"
        :label="cacheLabel"
        :loading="isCaching"
        :disabled="selectedIds.length === 0 || !online || isCaching"
        @click="onCache"
      />
      <span v-if="halaqat.length === 0" class="text-xs text-warning">
        {{ $t('pwa.offlineHalaqaSelectFirst') }}
      </span>
    </div>
  </div>
</template>
