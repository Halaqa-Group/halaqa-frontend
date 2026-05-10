<script setup lang="ts">
import type { Student } from '~/types'

const props = defineProps<{ student: Student }>()

const sortedGuardians = computed(() =>
  [...props.student.guardians].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
)
</script>

<template>
  <div class="flex flex-col gap-6 pt-6">
    <div class="rounded-xl p-5 border border-outline-variant">
      <h4 class="body-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
        <LucideUsers class="w-5 h-5 text-secondary" />
        {{ $t('pages.students.viewModal.guardiansInfoTitle') }}
      </h4>
      <div
        v-if="sortedGuardians.length === 0"
        class="text-center py-6 body-md text-on-surface-variant"
      >
        {{ $t('pages.students.viewModal.noGuardians') }}
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="g in sortedGuardians"
          :key="g.user.id"
          class="space-y-2 rounded-lg p-4 bg-surface-container-low"
        >
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 min-w-0">
              <LucideUser class="w-4 h-4 shrink-0 text-muted" />
              <span class="body-md font-medium text-on-surface truncate">
                {{ g.user.name }}
              </span>
              <span class="label-md text-on-surface-variant">· {{ g.relation }}</span>
            </div>
            <div class="flex flex-wrap gap-1 shrink-0">
              <UBadge
                v-if="g.is_primary"
                size="sm"
                color="primary"
                variant="subtle"
                :label="$t('pages.students.viewModal.guardianPrimary')"
              />
              <UBadge
                v-if="g.can_pickup"
                size="sm"
                color="success"
                variant="subtle"
                :label="$t('pages.students.viewModal.guardianCanPickup')"
              />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <LucidePhone class="w-4 h-4 shrink-0 text-muted" />
            <a
              v-if="g.user.phone"
              :href="`tel:${g.user.phone}`"
              class="body-md text-on-surface hover:text-primary"
              dir="ltr"
            >{{ g.user.phone }}</a>
            <span v-else class="body-md text-on-surface-variant" dir="ltr">—</span>
          </div>
          <div class="flex items-center gap-2 min-w-0">
            <LucideMail class="w-4 h-4 shrink-0 text-muted" />
            <a
              :href="`mailto:${g.user.email}`"
              class="body-md text-on-surface hover:text-primary truncate"
            >{{ g.user.email }}</a>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
