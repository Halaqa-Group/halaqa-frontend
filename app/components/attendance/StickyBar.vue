<script setup lang="ts">
defineProps<{
  isSaving?: boolean
}>()

defineEmits<{
  save: []
  discard: []
}>()

const { isDirty } = useAttendance()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-150 ease-in"
    enter-from-class="translate-y-full opacity-0"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="isDirty"
      class="fixed bottom-0 inset-x-0 z-40 px-3 sm:px-4 pb-3 sm:pb-4 pointer-events-none"
    >
      <div
        class="mx-auto max-w-5xl rounded-2xl bg-default border border-default shadow-2xl px-3 sm:px-5 py-3 flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto"
      >
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <span class="relative flex w-2.5 h-2.5 shrink-0">
            <span
              class="absolute inset-0 rounded-full opacity-75 animate-ping"
              style="background-color: var(--color-status-warning);"
            />
            <span
              class="relative rounded-full w-2.5 h-2.5"
              style="background-color: var(--color-status-warning);"
            />
          </span>
          <p class="text-xs sm:text-sm font-semibold truncate">
            {{ $t('pages.attendance.unsavedChanges') }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            variant="ghost"
            color="neutral"
            size="md"
            class="rounded-full"
            :aria-label="$t('pages.attendance.discardChanges')"
            @click="$emit('discard')"
          >
            <span class="hidden sm:inline">{{ $t('pages.attendance.discardChanges') }}</span>
            <UIcon name="i-lucide-x" class="sm:hidden w-4 h-4" />
          </UButton>
          <UButton
            color="primary"
            size="md"
            icon="i-lucide-save"
            :loading="isSaving"
            :disabled="isSaving"
            class="rounded-full font-bold px-3 sm:px-6"
            :aria-label="$t('pages.attendance.saveAttendance')"
            @click="$emit('save')"
          >
            <span class="hidden sm:inline">{{ $t('pages.attendance.saveAttendance') }}</span>
          </UButton>
        </div>
      </div>
    </div>
  </Transition>
</template>
