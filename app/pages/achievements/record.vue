<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.achievements.title', to: '/achievements' },
    { label: 'pages.achievements.recordTitle' }
  ]
})

const { t, locale } = useI18n()
const { canRecordAchievement: canRecord } = usePermissions()
const { selectedHalaqaId, isHalaqaScoped } = useGlobalHalaqa()
const { editing, hasStudents, loadStudents } = useAchievements()

const isEdit = computed(() => editing.value != null)

// Header title reflects create vs edit (the static breadcrumb only knows "record").
useSetPageTitle(() => t(isEdit.value ? 'pages.achievements.editTitle' : 'pages.achievements.recordTitle'))

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

// POST /achievements requires a halaqa_id, so an unscoped role must pick one here
// before the form can render.
watch(selectedHalaqaId, async (id) => {
  if (id) await loadStudents(id)
})

onMounted(async () => {
  if (!selectedHalaqaId.value) {
    // A scoped role with no halaqa has nothing to record against; unscoped roles
    // get the picker below instead.
    if (isHalaqaScoped.value) navigateTo('/achievements')
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
    </div>

    <!-- No halaqa: unscoped roles choose one here, scoped roles were redirected -->
    <div
      v-if="!selectedHalaqaId"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ isHalaqaScoped ? t('common.selectHalaqaPrompt') : t('common.selectHalaqaToContinue') }}
      </p>
      <HalaqaFilter required />
    </div>

    <template v-else>
      <UCard>
        <div v-if="!isHalaqaScoped" class="mb-4">
          <UFormField :label="t('common.selectHalaqa')">
            <HalaqaFilter required />
          </UFormField>
        </div>
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
          :icon="isEdit ? undefined : 'i-lucide-check-check'"
          :loading="formSaving"
          @click="setContinueToRecite(false)"
        >
          {{ isEdit ? t('pages.achievements.update') : t('pages.achievements.recordApprove') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
