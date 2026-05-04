<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ManagedUser, UserStatus } from '~/composables/useUsers'

type Mode = 'add' | 'edit'

const props = defineProps<{
  open: boolean
  mode: Mode
  // Required when mode === 'edit'.
  user?: ManagedUser | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  // Fired after a successful create or update — caller refreshes its list.
  'saved': []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const usersApi = useUsers()
const { roles: rolesCatalog, ensureLoaded: ensureRolesLoaded } = useRoles()
const apiError = useApiError()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

watch(isOpen, (v) => {
  if (v) ensureRolesLoaded()
})

// ── Form state ──────────────────────────────────────────────────────────────
//
// One reactive object that's a superset of both modes; each field is only used
// where the schema/template lets it. Avoids forking two near-duplicate states.

interface FormState {
  name: string
  email: string
  password: string
  phone: string
  status: UserStatus
}

function emptyState(): FormState {
  return { name: '', email: '', password: '', phone: '', status: 'active' }
}

const state = reactive<FormState>(emptyState())

// Roles live outside the form schema in both modes — they're driven by the
// shared checkbox picker. `originalRoles` is the snapshot taken when the modal
// opens so edit-mode submit can diff and call assign/remove for each delta.
const selectedRoles = ref<string[]>([])
const originalRoles = ref<string[]>([])

const schema = computed(() => {
  const base = {
    name: z.string({ error: () => t('validation.required') }).min(1, t('validation.required')).max(100),
    phone: z.string().max(20).optional().or(z.literal('')),
    status: z.enum(['active', 'inactive', 'suspended'] as const)
  }
  if (props.mode === 'add') {
    return z.object({
      ...base,
      email: z.email({ error: () => t('validation.email') }),
      password: z.string({ error: () => t('validation.required') }).min(8, t('validation.min', { min: 8 }))
    })
  }
  return z.object(base)
})

const isLoading = ref(false)
const error = ref('')

function syncFromProps() {
  if (props.mode === 'edit' && props.user) {
    state.name = props.user.name
    state.email = props.user.email
    state.password = ''
    state.phone = props.user.phone ?? ''
    state.status = props.user.status
    selectedRoles.value = [...props.user.roles]
    originalRoles.value = [...props.user.roles]
  } else {
    Object.assign(state, emptyState())
    selectedRoles.value = []
    originalRoles.value = []
  }
  error.value = ''
}

watch(
  [isOpen, () => props.mode, () => props.user?.id],
  ([open]) => { if (open) syncFromProps() },
  { immediate: true }
)

async function onSubmit(_event: FormSubmitEvent<FormState>) {
  error.value = ''
  isLoading.value = true
  try {
    if (props.mode === 'add') {
      await usersApi.create({
        name: state.name,
        email: state.email,
        password: state.password,
        phone: state.phone || null,
        status: state.status,
        roles: selectedRoles.value
      })
      toast.add({ title: t('pages.users.addModal.savedToast'), color: 'success' })
    } else if (props.user) {
      await usersApi.update(props.user.id, {
        name: state.name,
        phone: state.phone || null,
        status: state.status
      })
      // Roles can't ride the PATCH payload — diff against the snapshot and fire
      // assign/remove for each delta. Order: remove first, then add (cheap
      // insurance against any future "max roles" rule rejecting the add before
      // the remove lands).
      const toRemove = originalRoles.value.filter(s => !selectedRoles.value.includes(s))
      const toAdd = selectedRoles.value.filter(s => !originalRoles.value.includes(s))
      for (const slug of toRemove) {
        const entry = rolesCatalog.value.find(r => r.slug === slug)
        if (entry) await usersApi.removeRole(props.user.id, entry.id)
      }
      for (const slug of toAdd) {
        const entry = rolesCatalog.value.find(r => r.slug === slug)
        if (entry) await usersApi.assignRole(props.user.id, entry.id)
      }
      originalRoles.value = [...selectedRoles.value]
      toast.add({ title: t('pages.users.editModal.savedToast'), color: 'success' })
    }
    emit('saved')
  } catch (e: unknown) {
    error.value = apiError.format(e, t('auth.genericError'))
  } finally {
    isLoading.value = false
  }
}

// ── Roles ───────────────────────────────────────────────────────────────────
// Add mode: USelectMenu binds directly to state.roles and rides the create payload.
// Edit mode: checkboxes mutate `selectedRoles` only; submit diffs against the
// `originalRoles` snapshot and fires the dedicated assign/remove endpoints.

function toggleSelectedRole(slug: string, checked: boolean) {
  if (checked) {
    if (!selectedRoles.value.includes(slug)) selectedRoles.value = [...selectedRoles.value, slug]
  } else {
    selectedRoles.value = selectedRoles.value.filter(s => s !== slug)
  }
}

// ── Display helpers ─────────────────────────────────────────────────────────

const statusOptions = computed<{ label: string, value: UserStatus }[]>(() => [
  { value: 'active', label: t('pages.users.status.active') },
  { value: 'inactive', label: t('pages.users.status.inactive') },
  { value: 'suspended', label: t('pages.users.status.suspended') }
])

const avatar = computed(() => {
  if (props.mode !== 'edit' || !props.user) return null
  return {
    src: props.user.photoUrl ?? undefined,
    alt: props.user.name,
    text: props.user.name.slice(0, 1).toUpperCase()
  }
})

const titleText = computed(() =>
  props.mode === 'add' ? t('pages.users.addModal.title') : props.user?.name ?? ''
)

const saveLabel = computed(() =>
  props.mode === 'add'
    ? t('pages.users.addModal.saveButton')
    : t('pages.users.editModal.saveButton')
)
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <template #header>
      <div class="flex items-start gap-4">
        <UAvatar v-if="mode === 'edit' && avatar" v-bind="avatar" size="xl" />
        <div v-else class="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-user-plus" class="w-5 h-5 text-primary" />
        </div>

        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-highlighted truncate">
            {{ titleText }}
          </h3>
          <p v-if="mode === 'add'" class="text-sm text-muted mt-1">
            {{ $t('pages.users.addModal.description') }}
          </p>
          <p v-else-if="user" class="text-sm text-muted truncate" dir="ltr">
            {{ user.email }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <UForm
        id="user-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="$t('label.full_name')" name="name" required>
            <UInput v-model="state.name" />
          </UFormField>

          <UFormField :label="$t('label.email_address')" name="email" :required="mode === 'add'">
            <UInput
              v-model="state.email"
              type="email"
              dir="ltr"
              :disabled="mode === 'edit'"
            />
          </UFormField>

          <UFormField v-if="mode === 'add'" :label="$t('label.password')" name="password" required>
            <CommonPasswordToggle
              v-model:password="state.password"
              :placeholder="$t('placeholder.new_password')"
            />
          </UFormField>

          <UFormField :label="$t('label.phone')" name="phone">
            <UInput v-model="state.phone" dir="ltr" placeholder="+970599123456" />
          </UFormField>

          <UFormField :label="$t('pages.users.columns.status')" name="status">
            <USelectMenu
              v-model="state.status"
              :items="statusOptions"
              value-key="value"
            />
          </UFormField>
        </div>

        <UAlert v-if="error" color="error" variant="soft" :title="error" />
      </UForm>

      <!-- Roles: same picker in both modes. Add mode rides them in the create
           payload; edit mode diffs them on submit and fires assign/remove. -->
      <div class="mt-6">
        <h4 class="font-semibold text-sm mb-3">
          {{ $t('pages.users.editModal.rolesSection') }}
        </h4>
        <div class="space-y-2">
          <label
            v-for="r in rolesCatalog"
            :key="r.id"
            class="flex items-center gap-3 px-3 py-2 rounded-xl bg-elevated/50 cursor-pointer hover:bg-elevated transition"
          >
            <UCheckbox
              :model-value="selectedRoles.includes(r.slug)"
              @update:model-value="(v: boolean) => toggleSelectedRole(r.slug, v)"
            />
            <div class="flex-1 font-medium text-sm">
              {{ locale === 'ar' ? r.nameAr : r.nameEn }}
            </div>
          </label>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          size="lg"
          class="rounded-full"
          @click="isOpen = false"
        >
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="user-form"
          size="lg"
          class="rounded-full font-semibold"
          :loading="isLoading"
        >
          {{ saveLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
