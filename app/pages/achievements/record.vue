<script setup lang="ts">
definePageMeta({
  breadcrumb: [
    { label: 'home', to: '/' },
    { label: 'pages.achievements.title', to: '/achievements' },
    { label: 'pages.achievements.recordTitle' }
  ]
})

const { t } = useI18n()
const { canRecordAchievement: canRecord } = usePermissions()
const { selectedHalaqaId, isHalaqaScoped } = useGlobalHalaqa()
const { editing, hasStudents, loadStudents } = useAchievements()

const isEdit = computed(() => editing.value != null)

// Header title reflects create vs edit (the static breadcrumb only knows "record").
useSetPageTitle(() => t(isEdit.value ? 'pages.achievements.editTitle' : 'pages.achievements.recordTitle'))
// Back button lives in the header, before the title.
useSetPageBack('/achievements')

// `defineExpose` runs its object through `proxyRefs`, so the exposed `saving` ref
// arrives here already unwrapped — reading `.value` off it yields undefined and
// the spinner never shows.
const formRef = useTemplateRef<{ saving: boolean, setContinueToRecite: (v: boolean) => void } | null>('formRef')
const formSaving = computed(() => formRef.value?.saving ?? false)

function goBack() {
  navigateTo('/achievements')
}
function onSaved() {
  navigateTo('/achievements')
}
// Both actions submit the same form, so the spinner has to follow the button that
// was pressed — otherwise «حفظ ومتابعة» saves with the other button spinning.
const continueToRecite = ref(false)

// Set on the submit button's click (fires before the form submits) so the form
// knows whether to continue into the mushaf after saving.
function setContinueToRecite(value: boolean) {
  continueToRecite.value = value
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
    <!-- No halaqa: unscoped roles choose one here, scoped roles were redirected -->
    <div
      v-if="!selectedHalaqaId"
      class="flex flex-col items-center gap-3 py-12 rounded-xl border border-default bg-default"
    >
      <UIcon name="i-lucide-layers" class="w-10 h-10 text-muted" />
      <p class="text-sm text-muted">
        {{ t('common.selectHalaqaPrompt') }}
      </p>
    </div>

    <template v-else>
      <UCard
        :ui="{
          root: 'max-sm:border-0 max-sm:bg-transparent max-sm:rounded-none max-sm:ring-0 max-sm:shadow-none',
          body: 'max-sm:p-0'
        }"
      >
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
          :loading="formSaving && continueToRecite"
          :disabled="formSaving"
          @click="setContinueToRecite(true)"
        >
          {{ t('pages.achievements.saveAndRecite') }}
        </UButton>
        <UButton
          type="submit"
          form="achievement-form"
          :icon="isEdit ? undefined : 'i-lucide-check-check'"
          :loading="formSaving && !continueToRecite"
          :disabled="formSaving"
          @click="setContinueToRecite(false)"
        >
          {{ isEdit ? t('pages.achievements.update') : t('pages.achievements.recordApprove') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
