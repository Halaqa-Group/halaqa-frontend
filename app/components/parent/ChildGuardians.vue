<script setup lang="ts">
import type { ApiGuardian } from '~/types'

const props = defineProps<{
  guardians: ApiGuardian[]
}>()

const { t } = useI18n()

// Primary guardian first.
const sorted = computed(() =>
  [...props.guardians].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
)

function relationLabel(relation: string): string {
  return t(`pages.students.guardians.relations.${relation}`)
}
</script>

<template>
  <div class="pt-4">
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <h3 class="font-semibold">
          {{ t('pages.students.viewModal.guardiansInfoTitle') }}
        </h3>
      </template>

      <div v-if="sorted.length === 0" class="p-6 text-sm text-muted text-center">
        {{ t('pages.students.viewModal.noGuardians') }}
      </div>
      <ul v-else class="divide-y divide-default">
        <li v-for="g in sorted" :key="g.user.id" class="p-4 space-y-2">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-user" class="w-4 h-4 shrink-0 text-muted" />
              <span class="text-sm font-medium truncate">{{ g.user.name }}</span>
              <span class="text-xs text-muted">· {{ relationLabel(g.relation) }}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UBadge
                v-if="g.is_primary"
                size="sm"
                color="primary"
                variant="subtle"
                :label="t('pages.students.viewModal.guardianPrimary')"
              />
              <UBadge
                v-if="g.can_pickup"
                size="sm"
                color="success"
                variant="subtle"
                :label="t('pages.students.viewModal.guardianCanPickup')"
              />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-mail" class="w-4 h-4 shrink-0 text-muted" />
              <a :href="`mailto:${g.user.email}`" class="hover:underline truncate">{{ g.user.email }}</a>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="w-4 h-4 shrink-0 text-muted" />
              <a
                v-if="g.user.phone"
                :href="`tel:${g.user.phone}`"
                class="hover:underline"
                dir="ltr"
              >{{ g.user.phone }}</a>
              <span v-else class="text-muted" dir="ltr">—</span>
            </div>
          </div>
        </li>
      </ul>
    </UCard>
  </div>
</template>
