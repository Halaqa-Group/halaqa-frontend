<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { NAME_PART_MAX_LENGTH } from '~/data/constants'

const { t, locale } = useI18n()
const toast = useToast()
const { user, updateMe, isEmailVerified } = useAuth()
const { sending, cooldown, resend, resendLabel } = useEmailVerification()
const apiError = useApiError()

const verifiedOn = computed(() => {
  const iso = user.value?.emailVerifiedAt
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
    dateStyle: 'medium',
    numberingSystem: 'latn'
  })
})

// PATCH /me takes the four name parts; the display name is derived server-side.
const NAME_PART_FIELDS = [
  { key: 'first_name', labelKey: 'label.first_name' },
  { key: 'second_name', labelKey: 'label.second_name' },
  { key: 'third_name', labelKey: 'label.third_name' },
  { key: 'family_name', labelKey: 'label.family_name' }
] as const

const namePart = z.string({ error: () => t('validation.required') })
  .trim()
  .min(1, t('validation.required'))
  .max(NAME_PART_MAX_LENGTH, t('validation.max', { max: NAME_PART_MAX_LENGTH }))

const schema = z.object({
  first_name: namePart,
  second_name: namePart,
  third_name: namePart,
  family_name: namePart,
  phone: z.string().max(20).optional().or(z.literal('')),
  photo_url: z.string().optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  first_name: '',
  second_name: '',
  third_name: '',
  family_name: '',
  phone: '',
  photo_url: ''
})

watchEffect(() => {
  if (!user.value) return
  state.first_name = user.value.firstName ?? ''
  state.second_name = user.value.secondName ?? ''
  state.third_name = user.value.thirdName ?? ''
  state.family_name = user.value.familyName ?? ''
  state.phone = user.value.phone ?? ''
  state.photo_url = user.value.photoUrl ?? ''
})

const isLoading = ref(false)
const error = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  isLoading.value = true
  try {
    await updateMe({
      first_name: event.data.first_name,
      second_name: event.data.second_name,
      third_name: event.data.third_name,
      family_name: event.data.family_name,
      phone: event.data.phone || null,
      photo_url: event.data.photo_url || null
    })
    toast.add({ title: t('pages.profile.profileCard.savedToast'), color: 'success' })
  } catch (e: unknown) {
    error.value = apiError.format(e, t('auth.genericError'))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UCard :ui="{ root: 'mt-4' }">
    <template #header>
      <div>
        <h4 class="font-semibold text-base">
          {{ $t('pages.profile.profileCard.title') }}
        </h4>
        <p class="text-sm text-muted">
          {{ $t('pages.profile.profileCard.description') }}
        </p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UAlert
        v-if="user?.email && !isEmailVerified"
        color="warning"
        variant="soft"
        icon="i-lucide-badge-alert"
        :title="$t('pages.profile.email.unverifiedTitle')"
        :description="$t('pages.profile.email.unverifiedDescription')"
      >
        <template #actions>
          <UButton
            color="warning"
            size="sm"
            :label="resendLabel"
            :loading="sending"
            :disabled="cooldown > 0"
            @click="resend"
          />
        </template>
      </UAlert>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          v-for="field in NAME_PART_FIELDS"
          :key="field.key"
          :label="$t(field.labelKey)"
          :name="field.key"
          required
        >
          <UInput v-model="state[field.key]" :maxlength="NAME_PART_MAX_LENGTH" class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('label.email_address')" :hint="$t('pages.profile.profileCard.emailHint')">
        <UInput :model-value="user?.email ?? ''" disabled dir="ltr" />
        <template #help>
          <span v-if="isEmailVerified" class="inline-flex items-center gap-1 text-success">
            <UIcon name="i-lucide-badge-check" />
            {{ $t('pages.profile.email.verifiedOn', { date: verifiedOn }) }}
          </span>
        </template>
      </UFormField>

      <UFormField :label="$t('label.phone')" name="phone">
        <UInput v-model="state.phone" dir="ltr" placeholder="+970599123456" />
      </UFormField>

      <UFormField :label="$t('label.photo_url')" name="photo_url">
        <UInput v-model="state.photo_url" disabled dir="ltr" placeholder="https://..." />
      </UFormField>

      <UAlert v-if="error" color="error" variant="soft" :title="error" />

      <div class="flex justify-end">
        <UButton
          type="submit"
          :label="$t('pages.profile.profileCard.saveButton')"
          :loading="isLoading"
        />
      </div>
    </UForm>
  </UCard>
</template>
