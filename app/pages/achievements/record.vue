<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.achievements.title', to: '/achievements' },
    { label: 'pages.achievements.recordTitle' }
  ]
})

const { t, locale } = useI18n()
const { activeRole } = useAuth()
const { selectedHalaqaId, hasHalaqa } = useGlobalHalaqa()
const { editing, hasStudents, loadStudents } = useAchievements()

const isEdit = computed(() => editing.value != null)
const canRecord = computed(() => activeRole.value !== 'parent')

const formRef = useTemplateRef<{ saving: Ref<boolean>, setContinueToRecite: (v: boolean) => void } | null>('formRef')
const formSaving = computed(() => formRef.value?.saving.value ?? false)

const backIcon = computed(() => locale.value === 'ar' ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left')

function goBack() {
  navigateTo('/achievements')
}
function onSaved() {
  navigateTo('/achievements')
}
// Set on the submit button's click (fires before the form submits) so the form
// knows whether to continue into the mushaf after saving.
function setContinueToRecite(value: boolean) {
  formRef.value?.setContinueToRecite(value)
}

onMounted(async () => {
  if (!selectedHalaqaId.value) {
    navigateTo('/achievements')
    return
  }
  // The student picker needs the roster; load it if we arrived here directly.
  if (!hasStudents.value) await loadStudents(selectedHalaqaId.value)
})
</script>

<template>
  <div class="flex flex-col gap-6 max-w-2xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <UButton
        :icon="backIcon"
        variant="ghost"
        color="neutral"
        square
        :aria-label="t('common.back')"
        @click="goBack"
      />
      <div class="space-y-1 min-w-0">
        <h1 class="text-2xl font-bold truncate">
          {{ isEdit ? t('pages.achievements.editTitle') : t('pages.achievements.recordTitle') }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('pages.achievements.subtitle') }}
        </p>
      </div>
    </div>

    <!-- No halaqa -->
    <div
      v-if="!hasHalaqa"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <UCard>
        <AchievementForm ref="formRef" @saved="onSaved" />
      </UCard>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 flex-wrap">
        <UButton variant="soft" color="neutral" :disabled="formSaving" @click="goBack">
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          v-if="!isEdit && canRecord"
          type="submit"
          form="achievement-form"
          variant="soft"
          color="primary"
          icon="i-lucide-book-open"
          :disabled="formSaving"
          @click="setContinueToRecite(true)"
        >
          {{ t('pages.achievements.saveAndRecite') }}
        </UButton>
        <UButton
          type="submit"
          form="achievement-form"
          :loading="formSaving"
          @click="setContinueToRecite(false)"
        >
          {{ isEdit ? t('pages.achievements.update') : t('pages.achievements.save') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
