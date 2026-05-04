<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { user, updateMe } = useAuth()
const apiError = useApiError()

const schema = z.object({
  name: z.string({ error: () => t('validation.required') }).min(1, t('validation.required')).max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  photo_url: z.string().optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({ name: '', phone: '', photo_url: '' })

watchEffect(() => {
  if (!user.value) return
  state.name = user.value.name
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
      name: event.data.name,
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
      <UFormField :label="$t('label.full_name')" name="name" required>
        <UInput v-model="state.name" />
      </UFormField>

      <UFormField :label="$t('label.email_address')" :hint="$t('pages.profile.profileCard.emailHint')">
        <UInput :model-value="user?.email ?? ''" disabled dir="ltr" />
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
