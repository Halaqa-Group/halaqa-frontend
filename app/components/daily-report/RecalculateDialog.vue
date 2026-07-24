<script setup lang="ts">
// Prompts for a reason, then asks the parent to run the recalculation. The
// backend replaces the saved report for the day in place (no second copy).
const props = withDefaults(defineProps<{
  open: boolean
  loading?: boolean
}>(), { loading: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [reason: string]
}>()

const { t } = useI18n()
const reason = ref('')

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

// Reset the field each time the dialog opens so a stale reason never carries over.
watch(isOpen, (open) => {
  if (open) reason.value = ''
})

const trimmed = computed(() => reason.value.trim())
const canConfirm = computed(() => trimmed.value.length >= 3)

function onConfirm() {
  if (!canConfirm.value || props.loading) return
  emit('confirm', trimmed.value)
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('pages.dailyReport.recalculate.title')"
    :description="t('pages.dailyReport.recalculate.description')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <UFormField :label="t('pages.dailyReport.recalculate.reasonLabel')" required>
        <UTextarea
          v-model="reason"
          :rows="3"
          :placeholder="t('pages.dailyReport.recalculate.reasonPlaceholder')"
          autofocus
          class="w-full"
          :disabled="loading"
        />
      </UFormField>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          variant="soft"
          color="neutral"
          :disabled="loading"
          :label="t('common.cancel')"
          @click="isOpen = false"
        />
        <UButton
          color="primary"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          :disabled="!canConfirm"
          :label="t('pages.dailyReport.recalculate.confirm')"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
