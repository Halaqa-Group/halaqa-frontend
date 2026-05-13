<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Student, ApiGuardian } from '~/types'

const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const { user } = useAuth()
const toast = useToast()
const { fetchGuardians, linkGuardian, updateGuardian, unlinkGuardian, refetchStudent } = useStudents()

const isPrincipalOrVP = computed(() => {
  const roles = user.value?.roles ?? []
  return roles.includes('principal') || roles.includes('vice_principal')
})

const localGuardians = ref<ApiGuardian[]>([])
const isLoadingGuardians = ref(false)

async function reloadGuardians() {
  isLoadingGuardians.value = true
  try {
    localGuardians.value = await fetchGuardians(props.student.id)
  } finally {
    isLoadingGuardians.value = false
  }
}

onMounted(reloadGuardians)

const sortedGuardians = computed(() => {
  const source = localGuardians.value.length > 0 || isLoadingGuardians.value
    ? localGuardians.value
    : props.student.guardians
  return [...source].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
})

const guardianCount = computed(() => {
  return localGuardians.value.length || props.student.guardians.length
})

// ── Link dialog ─────────────────────────────────────────────────────────
const GUARDIAN_RELATIONS = ['father', 'mother', 'grandfather', 'grandmother', 'uncle', 'aunt', 'sibling', 'other'] as const
type GuardianRelation = typeof GUARDIAN_RELATIONS[number]

const linkOpen = ref(false)
const linkSaving = ref(false)

const linkSchema = computed(() => z.object({
  mode: z.enum(['email', 'userId']),
  email: z.string(),
  userId: z.coerce.string(),
  relation: z.enum(GUARDIAN_RELATIONS),
  isPrimary: z.boolean(),
  canPickup: z.boolean()
}))
type LinkSchema = z.infer<typeof linkSchema.value>

const linkState = reactive<LinkSchema>({
  mode: 'email',
  email: '',
  userId: '',
  relation: 'father',
  isPrimary: false,
  canPickup: true
})

const relationItems = computed(() =>
  GUARDIAN_RELATIONS.map(r => ({ value: r, label: t(`pages.students.guardians.relations.${r}`) }))
)

const linkModeItems = computed(() => [
  { value: 'email', label: t('pages.students.guardians.linkByEmail') },
  { value: 'userId', label: t('pages.students.guardians.linkByUserId') }
])

function openLinkDialog() {
  linkState.mode = 'email'
  linkState.email = ''
  linkState.userId = ''
  linkState.relation = 'father'
  linkState.isPrimary = guardianCount.value === 0
  linkState.canPickup = true
  linkOpen.value = true
}

function mapLinkError(e: any): string {
  const status = e?.response?.status ?? e?.status
  const raw = e?.data?.message
  const msg = Array.isArray(raw) ? raw.join('، ') : raw
  if (status === 404) return t('pages.students.guardians.errors.userNotFound')
  if (status === 409) return t('pages.students.guardians.errors.userDeactivated')
  if (status === 400 && typeof msg === 'string' && msg.toLowerCase().includes('already linked')) {
    return t('pages.students.guardians.errors.alreadyLinked')
  }
  return msg || t('pages.students.guardians.errors.linkFailed')
}

async function submitLink(_event: FormSubmitEvent<LinkSchema>) {
  if (linkSaving.value) return
  linkSaving.value = true
  try {
    const body: Record<string, any> = {
      relation: linkState.relation,
      is_primary: linkState.isPrimary,
      can_pickup: linkState.canPickup
    }
    if (linkState.mode === 'email') {
      const trimmed = linkState.email.trim()
      if (!trimmed) throw new Error(t('pages.students.guardians.errors.emailRequired'))
      body.email = trimmed
    } else {
      const id = Number(linkState.userId)
      if (!Number.isFinite(id) || id <= 0) throw new Error(t('pages.students.guardians.errors.userIdRequired'))
      body.guardian_user_id = id
    }
    await linkGuardian(props.student.id, body)
    await reloadGuardians()
    refetchStudent(props.student.id).catch(() => { /* non-fatal */ })
    linkOpen.value = false
    toast.add({ title: t('pages.students.guardians.toasts.linked'), color: 'success' })
  } catch (e: any) {
    const message = e?.message && !e?.response ? e.message : mapLinkError(e)
    toast.add({ title: message, color: 'error' })
  } finally {
    linkSaving.value = false
  }
}

// ── Mutations ───────────────────────────────────────────────────────────
async function patchGuardian(g: ApiGuardian, body: Record<string, any>, successKey: string) {
  try {
    await updateGuardian(props.student.id, g.user.id, body)
    await reloadGuardians()
    refetchStudent(props.student.id).catch(() => { /* non-fatal */ })
    toast.add({ title: t(successKey), color: 'success' })
  } catch (e: any) {
    const raw = e?.data?.message
    const message = Array.isArray(raw) ? raw.join('، ') : (raw || t('pages.students.guardians.errors.updateFailed'))
    toast.add({ title: message, color: 'error' })
  }
}

function promoteToPrimary(g: ApiGuardian) {
  if (g.is_primary) return
  patchGuardian(g, { is_primary: true }, 'pages.students.guardians.toasts.promoted')
}

function togglePickup(g: ApiGuardian) {
  patchGuardian(g, { can_pickup: !g.can_pickup }, 'pages.students.guardians.toasts.pickupToggled')
}

// ── Inline relation edit ────────────────────────────────────────────────
const editingRelationFor = ref<number | null>(null)
const relationDraft = ref<GuardianRelation>('father')

function startRelationEdit(g: ApiGuardian) {
  editingRelationFor.value = g.user.id
  relationDraft.value = g.relation as GuardianRelation
}

async function commitRelation(g: ApiGuardian) {
  const newRel = relationDraft.value
  editingRelationFor.value = null
  if (newRel === g.relation) return
  await patchGuardian(g, { relation: newRel }, 'pages.students.guardians.toasts.relationUpdated')
}

// ── Unlink confirm ──────────────────────────────────────────────────────
const unlinkOpen = ref(false)
const unlinkSaving = ref(false)
const pendingUnlink = ref<ApiGuardian | null>(null)

function requestUnlink(g: ApiGuardian) {
  pendingUnlink.value = g
  unlinkOpen.value = true
}

const unlinkIsLastGuardian = computed(() => guardianCount.value === 1)
const unlinkCopy = computed(() => {
  const name = pendingUnlink.value?.user.name ?? ''
  return unlinkIsLastGuardian.value
    ? t('pages.students.guardians.unlinkLastWarning', { name })
    : t('pages.students.guardians.unlinkConfirmMessage', { name })
})

async function confirmUnlink() {
  const g = pendingUnlink.value
  if (!g || unlinkSaving.value) return
  unlinkSaving.value = true
  try {
    await unlinkGuardian(props.student.id, g.user.id)
    await reloadGuardians()
    refetchStudent(props.student.id).catch(() => { /* non-fatal */ })
    toast.add({ title: t('pages.students.guardians.toasts.unlinked'), color: 'success' })
    unlinkOpen.value = false
    pendingUnlink.value = null
  } catch (e: any) {
    const raw = e?.data?.message
    const message = Array.isArray(raw) ? raw.join('، ') : (raw || t('pages.students.guardians.errors.unlinkFailed'))
    toast.add({ title: message, color: 'error' })
  } finally {
    unlinkSaving.value = false
  }
}

function rowMenu(g: ApiGuardian): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = []
  if (!g.is_primary) {
    items.push({
      label: t('pages.students.guardians.setPrimary'),
      icon: 'i-lucide-star',
      onSelect: () => promoteToPrimary(g)
    })
  }
  items.push({
    label: g.can_pickup
      ? t('pages.students.guardians.disablePickup')
      : t('pages.students.guardians.enablePickup'),
    icon: g.can_pickup ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
    onSelect: () => togglePickup(g)
  })
  items.push({
    label: t('pages.students.guardians.changeRelation'),
    icon: 'i-lucide-edit-3',
    onSelect: () => startRelationEdit(g)
  })
  return [
    items,
    [{
      label: t('pages.students.guardians.unlink'),
      icon: 'i-lucide-unlink',
      color: 'error',
      onSelect: () => requestUnlink(g)
    }]
  ]
}
</script>

<template>
  <div class="pt-4">
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">
            {{ t('pages.students.viewModal.guardiansInfoTitle') }}
          </h3>
          <UButton
            v-if="isPrincipalOrVP"
            icon="i-lucide-user-plus"
            size="sm"
            @click="openLinkDialog"
          >
            {{ t('pages.students.guardians.add') }}
          </UButton>
        </div>
      </template>

      <div v-if="isLoadingGuardians" class="p-6 text-sm text-muted text-center">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="sortedGuardians.length === 0" class="p-6 text-sm text-muted text-center">
        {{ t('pages.students.viewModal.noGuardians') }}
      </div>
      <ul v-else class="divide-y divide-default">
        <li
          v-for="g in sortedGuardians"
          :key="g.user.id"
          class="p-4 space-y-2"
        >
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-user" class="w-4 h-4 shrink-0 text-muted" />
              <span class="text-sm font-medium truncate">{{ g.user.name }}</span>
              <span v-if="editingRelationFor !== g.user.id" class="text-xs text-muted">
                · {{ t(`pages.students.guardians.relations.${g.relation}`) }}
              </span>
              <span v-else class="flex items-center gap-1">
                <USelect
                  v-model="relationDraft"
                  :items="relationItems"
                  value-key="value"
                  size="sm"
                  class="min-w-32"
                />
                <UButton
                  icon="i-lucide-check"
                  color="success"
                  variant="soft"
                  size="xs"
                  square
                  @click="commitRelation(g)"
                />
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  @click="editingRelationFor = null"
                />
              </span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UBadge
                v-if="g.is_primary"
                size="sm"
                color="primary"
                variant="subtle"
                :label="t('pages.students.viewModal.guardianPrimary')"
              />
              <UBadge
                v-if="g.can_pickup"
                size="sm"
                color="success"
                variant="subtle"
                :label="t('pages.students.viewModal.guardianCanPickup')"
              />
              <UDropdownMenu
                v-if="isPrincipalOrVP"
                :items="rowMenu(g)"
                :content="{ align: 'end', collisionPadding: 12 }"
              >
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                />
              </UDropdownMenu>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-mail" class="w-4 h-4 shrink-0 text-muted" />
              <a :href="`mailto:${g.user.email}`" class="hover:underline truncate">{{ g.user.email }}</a>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="w-4 h-4 shrink-0 text-muted" />
              <a
                v-if="g.user.phone"
                :href="`tel:${g.user.phone}`"
                class="hover:underline"
                dir="ltr"
              >{{ g.user.phone }}</a>
              <span v-else class="text-muted" dir="ltr">—</span>
            </div>
          </div>
        </li>
      </ul>
    </UCard>

    <!-- Link guardian modal -->
    <UModal
      v-model:open="linkOpen"
      :title="t('pages.students.guardians.linkTitle')"
      :ui="{ content: 'sm:max-w-md rounded-2xl' }"
    >
      <UButton class="sr-only" tabindex="-1" />
      <template #body>
        <UForm
          id="guardian-link-form"
          :schema="linkSchema"
          :state="linkState"
          class="space-y-4"
          @submit="submitLink"
        >
          <UFormField :label="t('pages.students.guardians.linkMode')" name="mode">
            <USelect
              v-model="linkState.mode"
              :items="linkModeItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="linkState.mode === 'email'"
            :label="t('pages.students.guardians.email')"
            :hint="t('pages.students.guardians.emailHint')"
            name="email"
            required
          >
            <UInput v-model="linkState.email" type="email" dir="ltr" class="w-full" />
          </UFormField>

          <UFormField
            v-else
            :label="t('pages.students.guardians.userId')"
            :hint="t('pages.students.guardians.userIdHint')"
            name="userId"
            required
          >
            <UInput v-model="linkState.userId" type="number" inputmode="numeric" dir="ltr" class="w-full" />
          </UFormField>

          <UFormField :label="t('pages.students.guardians.relation')" name="relation" required>
            <USelect
              v-model="linkState.relation"
              :items="relationItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <div class="flex flex-wrap items-center gap-4 pt-1">
            <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
              <UCheckbox v-model="linkState.isPrimary" />
              {{ t('pages.students.guardians.isPrimary') }}
            </label>
            <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
              <UCheckbox v-model="linkState.canPickup" />
              {{ t('pages.students.guardians.canPickup') }}
            </label>
          </div>
        </UForm>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <UButton
            variant="soft"
            color="neutral"
            :disabled="linkSaving"
            @click="linkOpen = false"
          >
            {{ t('pages.students.addModal.cancel') }}
          </UButton>
          <UButton type="submit" form="guardian-link-form" :loading="linkSaving">
            {{ t('pages.students.guardians.add') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Unlink confirm -->
    <CommonConfirmDialog
      v-model:open="unlinkOpen"
      :title="t('pages.students.guardians.unlinkConfirmTitle')"
      :message="unlinkCopy"
      :confirm-label="t('pages.students.guardians.unlink')"
      destructive
      :loading="unlinkSaving"
      @confirm="confirmUnlink"
    />
  </div>
</template>
