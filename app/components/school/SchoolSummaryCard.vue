<script setup lang="ts">
import type { ApiSchool } from '~/types'

const { t } = useI18n()
const toast = useToast()
const { activeRole } = useAuth()
const { school, isLoading, fetchSchool, updateSchool } = useSchool()

const editOpen = ref(false)
const saving = ref(false)

const form = reactive({
  name: '',
  address: '',
  phone: '',
  status: 'active' as 'active' | 'inactive'
})

const statusItems = computed(() => [
  { label: t('pages.home.schoolCard.active'), value: 'active' as const },
  { label: t('pages.home.schoolCard.inactive'), value: 'inactive' as const }
])

watch(activeRole, (role) => {
  if (role === 'principal') fetchSchool()
}, { immediate: true })

function telHref(phone: string) {
  return `tel:${phone.replace(/[\s().-]/g, '')}`
}

function openEdit() {
  const s = school.value
  if (!s) return
  form.name = s.name
  form.address = s.address
  form.phone = s.phone ?? ''
  form.status = s.status
  editOpen.value = true
}

function toastApiError(e: unknown) {
  const raw = (e as { data?: { message?: string | string[] } })?.data?.message
  const message = Array.isArray(raw) ? raw.join(', ') : (typeof raw === 'string' ? raw : t('pages.home.schoolCard.toastError'))
  toast.add({ title: message, color: 'error' })
}

function validate(): string | null {
  if (!form.name.trim()) return t('pages.home.schoolCard.validationName')
  return null
}

async function submitForm() {
  const err = validate()
  if (err) {
    toast.add({ title: err, color: 'warning' })
    return
  }
  saving.value = true
  try {
    const phone = form.phone.trim()
    const payload: Partial<Pick<ApiSchool, 'name' | 'address' | 'phone' | 'status'>> = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: phone.length ? phone : null,
      status: form.status
    }
    await updateSchool(payload)
    toast.add({ title: t('pages.home.schoolCard.toastSaved'), color: 'success' })
    editOpen.value = false
  } catch (e) {
    toastApiError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="activeRole === 'principal'" class="rounded-2xl p-5 ring ring-card-border" style="background-color: var(--color-surface-container-lowest);">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div class="space-y-1 min-w-0">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-building-2" class="w-5 h-5 shrink-0" style="color: var(--color-primary);" />
          <h3 class="text-lg font-bold" style="color: var(--color-on-surface);">
            {{ t('pages.home.schoolCard.title') }}
          </h3>
        </div>
        <p class="text-sm" style="color: var(--color-on-surface-variant);">
          {{ t('pages.home.schoolCard.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="school && !isLoading"
        icon="i-lucide-pencil"
        color="primary"
        variant="soft"
        class="shrink-0 self-start"
        @click="openEdit"
      >
        {{ t('pages.home.schoolCard.edit') }}
      </UButton>
    </div>

    <div class="mt-4">
      <div v-if="isLoading" class="flex items-center gap-2 py-6 justify-center">
        <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin" style="color: var(--color-primary);" />
      </div>
      <dl v-else-if="school" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <dt class="font-medium mb-0.5" style="color: var(--color-on-surface-variant);">
            {{ t('pages.home.schoolCard.fieldName') }}
          </dt>
          <dd class="font-semibold" style="color: var(--color-on-surface);">
            {{ school.name }}
          </dd>
        </div>
        <div>
          <dt class="font-medium mb-0.5" style="color: var(--color-on-surface-variant);">
            {{ t('pages.home.schoolCard.status') }}
          </dt>
          <dd>
            <UBadge
              :color="school.status === 'active' ? 'success' : 'neutral'"
            >
              {{
                school.status === 'active'
                  ? t('pages.home.schoolCard.active')
                  : t('pages.home.schoolCard.inactive')
              }}
            </UBadge>
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="font-medium mb-0.5" style="color: var(--color-on-surface-variant);">
            {{ t('pages.home.schoolCard.address') }}
          </dt>
          <dd style="color: var(--color-on-surface);">
            {{ school.address || '—' }}
          </dd>
        </div>
        <div>
          <dt class="font-medium mb-0.5" style="color: var(--color-on-surface-variant);">
            {{ t('pages.home.schoolCard.phone') }}
          </dt>
          <dd>
            <a
              v-if="school.phone"
              :href="telHref(school.phone)"
              class="font-medium underline-offset-2 hover:underline"
              style="color: var(--color-primary);"
              dir="ltr"
            >{{ school.phone }}</a>
            <span v-else style="color: var(--color-on-surface-variant);">—</span>
          </dd>
        </div>
      </dl>
    </div>

    <UModal
      v-model:open="editOpen"
      :title="t('pages.home.schoolCard.formTitle')"
      :ui="{ content: 'sm:max-w-lg rounded-2xl', footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('pages.home.schoolCard.fieldName')" name="name">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <UFormField :label="t('pages.home.schoolCard.fieldAddress')" name="address">
            <UTextarea v-model="form.address" class="w-full" :rows="3" autoresize />
          </UFormField>
          <UFormField :label="t('pages.home.schoolCard.fieldPhone')" name="phone">
            <UInput v-model="form.phone" class="w-full" dir="ltr" />
          </UFormField>
          <UFormField :label="t('pages.home.schoolCard.fieldStatus')" name="status">
            <USelect
              v-model="form.status"
              :items="statusItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <UButton variant="ghost" color="neutral" :disabled="saving" @click="close">
          {{ t('common.cancel') }}
        </UButton>
        <UButton :loading="saving" @click="submitForm">
          {{ t('common.save') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
