<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

function onConfirm() {
  emit('confirm')
  isOpen.value = false
}

function onCancel() {
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="message"
    :ui="{
      content: 'sm:max-w-md rounded-2xl',
      header: 'px-5 pt-5 pb-2',
      footer: 'px-5 pb-5 pt-2'
    }"
  >
    <template #footer>
      <div class="flex items-center gap-2 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          class="flex-1 rounded-xl"
          @click="onCancel"
        >
          {{ cancelLabel || t('common.cancel') }}
        </UButton>
        <UButton
          :color="destructive ? 'error' : 'primary'"
          class="flex-1 rounded-xl font-bold"
          @click="onConfirm"
        >
          {{ confirmLabel || t('common.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
