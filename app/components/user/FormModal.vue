<script setup lang="ts">
import * as z from 'zod'
import type { ManagedUser, UserStatus } from '~/composables/useUsers'
import ConfirmDialog from '~/components/common/ConfirmDialog.vue'
import { NAME_PART_MAX_LENGTH } from '~/data/constants'

type Mode = 'add' | 'edit'

const props = defineProps<{
  open: boolean
  mode: Mode
  user?: ManagedUser | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const api = useApi()
const usersApi = useUsers()
const { roles: rolesCatalog, ensureLoaded: ensureRolesLoaded } = useRoles()
const apiError = useApiError()
const { user: authUser } = useAuth()

const isOpen = computed({
  get: () => props.open,
  set: v => emit('update:open', v)
})

watch(isOpen, (v) => {
  if (v) ensureRolesLoaded()
})

const PHONE_PATTERN = /^\+\d{1,3}[\d\s-]{6,18}$/

// The API stores the four Arabic name parts and derives the display `name` from
// them; it rejects a `name` in the body.
const NAME_PART_FIELDS = [
  { key: 'first_name', labelKey: 'label.first_name' },
  { key: 'second_name', labelKey: 'label.second_name' },
  { key: 'third_name', labelKey: 'label.third_name' },
  { key: 'family_name', labelKey: 'label.family_name' }
] as const

interface FormState {
  first_name: string
  second_name: string
  third_name: string
  family_name: string
  id_number: string
  email: string
  password: string
  phone: string
  status: UserStatus
}

function emptyState(): FormState {
  return {
    first_name: '',
    second_name: '',
    third_name: '',
    family_name: '',
    id_number: '',
    email: '',
    password: '',
    phone: '',
    status: 'active'
  }
}

const state = reactive<FormState>(emptyState())

const selectedRoles = ref<string[]>([])
const originalRoles = ref<string[]>([])
const hasTeacherRole = computed(() => selectedRoles.value.includes('teacher'))
const hasParentRole = computed(() => selectedRoles.value.includes('parent'))

const isSelf = computed(() =>
  props.mode === 'edit' && !!props.user && !!authUser.value && props.user.id === authUser.value.id
)
const lockPrincipalRole = computed(() =>
  isSelf.value && originalRoles.value.includes('principal')
)
const lockStatus = computed(() => isSelf.value)

const phoneLabel = computed(() => {
  if (hasTeacherRole.value && hasParentRole.value) return t('label.phone')
  if (hasTeacherRole.value) return t('pages.users.form.teacherPhone')
  if (hasParentRole.value) return t('pages.users.form.parentPhone')
  return t('label.phone')
})

const schema = computed(() => {
  const phone = z.string()
    .max(20)
    .refine(v => v === '' || PHONE_PATTERN.test(v.trim()), { message: t('validation.contact_format') })
    .optional()
    .or(z.literal(''))

  const namePart = z.string({ error: () => t('validation.required') })
    .trim()
    .min(1, t('validation.required'))
    .max(NAME_PART_MAX_LENGTH, t('validation.max', { max: NAME_PART_MAX_LENGTH }))

  const base = {
    first_name: namePart,
    second_name: namePart,
    third_name: namePart,
    family_name: namePart,
    phone,
    status: z.enum(['active', 'inactive', 'suspended'] as const)
  }
  if (props.mode === 'add') {
    return z.object({
      ...base,
      id_number: z.string({ error: () => t('validation.required') })
        .min(1, t('validation.required'))
        .max(20),
      // Optional — the national ID is the required identifier and doubles as a
      // login handle, so a user may have no email at all.
      email: z.email({ error: () => t('validation.email') }).or(z.literal('')),
      password: z.string({ error: () => t('validation.required') }).min(8, t('validation.min', { min: 8 }))
    })
  }
  return z.object(base)
})

const isLoading = ref(false)
const error = ref('')

function syncFromProps() {
  if (props.mode === 'edit' && props.user) {
    state.first_name = props.user.firstName
    state.second_name = props.user.secondName
    state.third_name = props.user.thirdName
    state.family_name = props.user.familyName
    state.email = props.user.email ?? ''
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

const nameParts = computed(() => NAME_PART_FIELDS.map(f => state[f.key]))

const isDirty = computed(() => {
  if (props.mode === 'add') {
    return nameParts.value.some(Boolean) || !!state.id_number || !!state.email || !!state.password
      || !!state.phone || selectedRoles.value.length > 0
  }
  if (!props.user) return false
  const user = props.user
  const nameChanged = state.first_name !== user.firstName
    || state.second_name !== user.secondName
    || state.third_name !== user.thirdName
    || state.family_name !== user.familyName
  const baseChanged = nameChanged
    || state.phone !== (props.user.phone ?? '')
    || state.status !== props.user.status
  const rolesChanged = selectedRoles.value.length !== originalRoles.value.length
    || selectedRoles.value.some(s => !originalRoles.value.includes(s))
  return baseChanged || rolesChanged
})

const canSubmit = computed(() => selectedRoles.value.length > 0 && !isLoading.value)

async function onSubmit() {
  error.value = ''
  if (selectedRoles.value.length === 0) {
    error.value = t('pages.users.form.rolesRequired')
    return
  }

  if (isSelf.value) {
    if (originalRoles.value.includes('principal') && !selectedRoles.value.includes('principal')) {
      error.value = t('pages.users.form.cannotRemoveOwnPrincipal')
      return
    }
    if (props.user && state.status !== props.user.status) {
      error.value = t('pages.users.form.cannotChangeOwnStatus')
      return
    }
  }

  isLoading.value = true
  try {
    if (props.mode === 'add') {
      await usersApi.create({
        first_name: state.first_name.trim(),
        second_name: state.second_name.trim(),
        third_name: state.third_name.trim(),
        family_name: state.family_name.trim(),
        id_number: state.id_number.trim(),
        email: state.email.trim().toLowerCase() || null,
        password: state.password,
        phone: state.phone.trim() || null,
        status: state.status,
        roles: selectedRoles.value
      })
      toast.add({ title: t('pages.users.addModal.savedToast'), color: 'success' })
      // The backend stores an id_number with a bad checksum but returns a
      // warning in the response envelope — surface it without blocking.
      for (const w of api.lastWarnings.value) {
        toast.add({ title: w, color: 'warning' })
      }
    } else if (props.user) {
      await usersApi.update(props.user.id, {
        first_name: state.first_name.trim(),
        second_name: state.second_name.trim(),
        third_name: state.third_name.trim(),
        family_name: state.family_name.trim(),
        phone: state.phone.trim() || null,
        status: state.status
      })
      const toRemove = originalRoles.value.filter(s => !selectedRoles.value.includes(s))
      const toAdd = selectedRoles.value.filter(s => !originalRoles.value.includes(s))
      const appliedRemove: string[] = []
      const appliedAdd: string[] = []
      try {
        for (const slug of toRemove) {
          const entry = rolesCatalog.value.find(r => r.slug === slug)
          if (!entry) continue
          await usersApi.removeRole(props.user.id, entry.id)
          appliedRemove.push(slug)
        }
        for (const slug of toAdd) {
          const entry = rolesCatalog.value.find(r => r.slug === slug)
          if (!entry) continue
          await usersApi.assignRole(props.user.id, entry.id)
          appliedAdd.push(slug)
        }
      } catch (e) {
        originalRoles.value = originalRoles.value
          .filter(s => !appliedRemove.includes(s))
          .concat(appliedAdd)
        throw e
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

function toggleSelectedRole(slug: string, checked: boolean) {
  if (checked) {
    if (!selectedRoles.value.includes(slug)) selectedRoles.value = [...selectedRoles.value, slug]
  } else {
    selectedRoles.value = selectedRoles.value.filter(s => s !== slug)
  }
}

function isRoleLocked(slug: string): boolean {
  return slug === 'principal' && lockPrincipalRole.value
}

const discardOpen = ref(false)

function requestClose() {
  if (isLoading.value) return
  if (isDirty.value) {
    discardOpen.value = true
    return
  }
  isOpen.value = false
}

function confirmDiscard() {
  discardOpen.value = false
  isOpen.value = false
}

const statusOptions = computed<{ label: string, value: UserStatus }[]>(() => [
  { value: 'active', label: t('pages.users.status.active') },
  { value: 'inactive', label: t('pages.users.status.inactive') },
  { value: 'suspended', label: t('pages.users.status.suspended') }
])

const titleText = computed(() =>
  props.mode === 'add' ? t('pages.users.addModal.title') : props.user?.name ?? ''
)

const saveLabel = computed(() =>
  props.mode === 'add'
    ? t('pages.users.addModal.saveButton')
    : t('pages.users.editModal.saveButton')
)

const isCatalogLoading = computed(() => rolesCatalog.value.length === 0)
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :dismissible="false"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <h3 class="text-lg font-bold text-highlighted truncate">
          {{ titleText }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :disabled="isLoading"
          @click="requestClose"
        />
      </div>
    </template>

    <template #body>
      <UForm
        id="user-form"
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            v-for="field in NAME_PART_FIELDS"
            :key="field.key"
            :label="$t(field.labelKey)"
            :name="field.key"
            required
          >
            <UInput v-model="state[field.key]" :maxlength="NAME_PART_MAX_LENGTH" />
          </UFormField>

          <UFormField v-if="mode === 'add'" :label="$t('label.id_number')" name="id_number" required>
            <UInput v-model="state.id_number" dir="ltr" :placeholder="$t('placeholder.id_number')" />
          </UFormField>

          <UFormField
            :label="$t('label.email_address')"
            name="email"
            :hint="mode === 'add' ? $t('common.optional') : undefined"
          >
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

          <UFormField :label="phoneLabel" name="phone">
            <UInput v-model="state.phone" dir="ltr" placeholder="+970599123456" />
          </UFormField>

          <UFormField
            v-if="mode === 'edit'"
            :label="$t('pages.users.columns.status')"
            name="status"
            :hint="lockStatus ? $t('pages.users.form.cannotChangeOwnStatus') : undefined"
          >
            <USelectMenu
              v-model="state.status"
              :items="statusOptions"
              value-key="value"
              :disabled="lockStatus"
            />
          </UFormField>
        </div>

        <div>
          <h4 class="font-semibold text-sm mb-3">
            {{ $t('pages.users.editModal.rolesSection') }}
            <span class="text-error">*</span>
          </h4>

          <div v-if="isCatalogLoading" class="space-y-2">
            <div
              v-for="i in 3"
              :key="i"
              class="h-10 rounded-md bg-elevated/50 animate-pulse"
            />
          </div>

          <div v-else class="space-y-2">
            <label
              v-for="r in rolesCatalog"
              :key="r.id"
              class="flex items-center gap-3 px-3 py-2 rounded-md bg-elevated/50 transition"
              :class="isRoleLocked(r.slug)
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer hover:bg-elevated'"
            >
              <UCheckbox
                :model-value="selectedRoles.includes(r.slug)"
                :disabled="isRoleLocked(r.slug)"
                @update:model-value="(v: boolean | 'indeterminate') => toggleSelectedRole(r.slug, v === true)"
              />
              <div class="flex-1 font-medium text-sm">
                {{ locale === 'ar' ? r.nameAr : r.nameEn }}
              </div>
              <UIcon
                v-if="isRoleLocked(r.slug)"
                name="i-lucide-lock"

                class="size-4 text-muted"
                :aria-label="$t('pages.users.form.cannotRemoveOwnPrincipal')"
              />
            </label>
          </div>

          <p v-if="lockPrincipalRole" class="text-xs text-muted mt-2">
            {{ $t('pages.users.form.cannotRemoveOwnPrincipal') }}
          </p>
        </div>

        <UAlert v-if="error" color="error" variant="soft" :title="error" />
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          :disabled="isLoading"
          @click="requestClose"
        >
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="user-form"
          :loading="isLoading"
          :disabled="!canSubmit"
        >
          {{ saveLabel }}
        </UButton>
      </div>
    </template>
  </UModal>

  <ConfirmDialog
    v-model:open="discardOpen"
    :title="$t('pages.users.form.discardTitle')"
    :message="$t('pages.users.form.discardMessage')"
    :confirm-label="$t('pages.users.form.discardConfirm')"
    destructive
    @confirm="confirmDiscard"
  />
</template>
