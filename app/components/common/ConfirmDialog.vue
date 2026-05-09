<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  // Override the default icon. Falls back to a destructive/info pair.
  icon?: string
  loading?: boolean
}>(), {
  destructive: false,
  loading: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

function onConfirm() {
  emit('confirm')
  // Caller closes the dialog explicitly when its async work resolves; closing
  // here would race a `loading` button state.
  if (!props.loading) isOpen.value = false
}

function onCancel() {
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      content: 'sm:max-w-md shadow-2xl',
      header: 'px-6 pt-6 pb-4 border-b-0',
      body: 'px-6 pb-2 pt-0',
      footer: 'border-t-0'
    }">
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <h3 class="text-lg font-bold text-highlighted">
          {{ title }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :disabled="loading"
          @click="onCancel" />
      </div>
    </template>

    <template #body>
      <p class="text-sm text-muted leading-relaxed">
        {{ message }}
      </p>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          variant="soft"
          color="neutral"
          :disabled="loading"
          @click="onCancel">
          {{ cancelLabel || t('common.cancel') }}
        </UButton>
        <UButton
          :color="destructive ? 'error' : 'primary'"
          :loading="loading"
          @click="onConfirm">
          {{ confirmLabel || t('common.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
