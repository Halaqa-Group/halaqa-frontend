<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ApiSupervisorSummary } from '~/types'

interface ApiUser { id: number, name: string, email: string, status: string }

const props = defineProps<{
  halaqaId: number
  supervisors: ApiSupervisorSummary[]
  canManage: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const toast = useToast()
const apiError = useApiError()
const { assignSupervisor, unassignSupervisor } = useHalaqaSupervisors()
const api = useApi()

const supervisorOptions = ref<{ id: number, name: string }[]>([])

async function loadOptions() {
  if (supervisorOptions.value.length) return
  try {
    const data = await api<{ items: ApiUser[] }>('/users?role=supervisor&limit=100')
    supervisorOptions.value = data.items.map(u => ({ id: u.id, name: u.name }))
  } catch {
    supervisorOptions.value = []
  }
}

const assignSchema = computed(() => z.object({
  supervisor_user_id: z.number({ error: () => t('pages.halaqat.validationSupervisor') })
    .int()
    .positive(t('pages.halaqat.validationSupervisor'))
}))

type AssignSchema = z.output<typeof assignSchema.value>

const assignOpen = ref(false)
const assignState = reactive<{ supervisor_user_id: number | null }>({
  supervisor_user_id: null
})
const assignSaving = ref(false)

async function openAssign() {
  await loadOptions()
  assignState.supervisor_user_id = null
  assignOpen.value = true
}

const supervisorSelectItems = computed(() => [
  { label: t('pages.halaqat.supervisors.fieldSupervisor'), value: null },
  ...supervisorOptions.value.map(u => ({ label: u.name, value: u.id }))
])

async function submitAssign(event: FormSubmitEvent<AssignSchema>) {
  assignSaving.value = true
  try {
    await assignSupervisor(props.halaqaId, { supervisor_user_id: event.data.supervisor_user_id })
    toast.add({ title: t('pages.halaqat.supervisors.toastAssigned'), color: 'success' })
    assignOpen.value = false
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  } finally {
    assignSaving.value = false
  }
}

async function remove(s: ApiSupervisorSummary) {
  try {
    await unassignSupervisor(props.halaqaId, s.user_id)
    toast.add({ title: t('pages.halaqat.supervisors.toastRemoved'), color: 'success' })
    emit('changed')
  } catch (e: unknown) {
    toast.add({ title: apiError.format(e, t('pages.halaqat.toastError')), color: 'error' })
  }
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ t('pages.halaqat.supervisors.title') }}
        </h3>
        <UButton
          v-if="canManage"
          icon="i-lucide-plus"
          size="sm"
          @click="openAssign"
        >
          {{ t('pages.halaqat.supervisors.addTitle') }}
        </UButton>
      </div>
    </template>

    <div v-if="!supervisors.length" class="p-6 text-sm text-muted text-center">
      {{ t('pages.halaqat.supervisors.noActive') }}
    </div>
    <ul v-else class="divide-y divide-default">
      <li
        v-for="s in supervisors"
        :key="s.user_id"
        class="flex items-center justify-between gap-3 p-4"
      >
        <div class="space-y-1">
          <p class="font-medium">{{ s.name }}</p>
          <p class="text-xs text-muted">
            {{ t('pages.halaqat.supervisors.assignedAt') }}:
            {{ new Date(s.assigned_at).toLocaleDateString(undefined, { numberingSystem: 'latn' }) }}
          </p>
        </div>
        <UButton
          v-if="canManage"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          square
          :aria-label="t('pages.halaqat.supervisors.remove')"
          @click="remove(s)"
        />
      </li>
    </ul>
  </UCard>

  <UModal
    v-model:open="assignOpen"
    :title="t('pages.halaqat.supervisors.addTitle')"
    :ui="{ content: 'sm:max-w-md rounded-2xl' }"
  >
    <UButton class="sr-only" tabindex="-1" />
    <template #body>
      <UForm
        id="supervisor-assign-form"
        :schema="assignSchema"
        :state="assignState"
        class="space-y-4"
        @submit="submitAssign"
      >
        <UFormField
          :label="t('pages.halaqat.supervisors.fieldSupervisor')"
          name="supervisor_user_id"
          required
        >
          <USelect
            v-model="assignState.supervisor_user_id"
            :items="supervisorSelectItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton variant="soft" color="neutral" :disabled="assignSaving" @click="assignOpen = false">
          {{ t('pages.halaqat.cancel') }}
        </UButton>
        <UButton type="submit" form="supervisor-assign-form" :loading="assignSaving">
          {{ t('pages.halaqat.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
