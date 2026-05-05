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

const resolvedIcon = computed(() =>
  props.icon || (props.destructive ? 'i-lucide-triangle-alert' : 'i-lucide-circle-help')
)

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
      body: 'hidden',
      footer: 'px-6 pb-6 pt-0 border-t-0'
    }"
  >
    <template #header>
      <div class="flex items-start gap-4">
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          :class="destructive ? 'bg-error/10' : 'bg-primary/10'"
        >
          <UIcon
            :name="resolvedIcon"
            class="w-5 h-5"
            :class="destructive ? 'text-error' : 'text-primary'"
          />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-highlighted leading-tight">
            {{ title }}
          </h3>
          <p class="text-sm text-muted mt-1.5 leading-relaxed">
            {{ message }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-3 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          size="lg"
          block
          class="flex-1 rounded-full justify-center"
          :disabled="loading"
          @click="onCancel"
        >
          {{ cancelLabel || t('common.cancel') }}
        </UButton>
        <UButton
          :color="destructive ? 'error' : 'primary'"
          size="lg"
          block
          class="flex-1 rounded-full font-semibold justify-center"
          :loading="loading"
          @click="onConfirm"
        >
          {{ confirmLabel || t('common.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
