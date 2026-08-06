<script setup lang="ts">
import type { Session } from '~/composables/useAuth'

const { t, locale } = useI18n()
const toast = useToast()
const { listSessions, revokeSession, logoutAll } = useAuth()
const apiError = useApiError()

const sessions = ref<Session[] | null>(null)
const isLoading = ref(false)
const loadError = ref('')

async function load() {
  loadError.value = ''
  isLoading.value = true
  try {
    sessions.value = await listSessions()
  } catch (e: unknown) {
    loadError.value = apiError.format(e, t('pages.profile.sessions.loadError'))
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const revokeTarget = ref<Session | null>(null)
const logoutAllConfirm = ref(false)

async function onRevokeConfirmed() {
  const target = revokeTarget.value
  if (!target) return
  revokeTarget.value = null
  try {
    await revokeSession(target.id)
    toast.add({ title: t('pages.profile.sessions.revokedToast'), color: 'success' })
    await load()
  } catch (e: unknown) {
    toast.add({
      title: apiError.format(e, t('pages.profile.sessions.revokeError')),
      color: 'error'
    })
  }
}

async function onLogoutAllConfirmed() {
  logoutAllConfirm.value = false
  await logoutAll()
}

const dateLocale = computed(() => locale.value === 'ar' ? 'ar-SA' : 'en-US')

function formatDate(iso: string | null) {
  if (!iso) return t('pages.profile.sessions.never')
  return new Date(iso).toLocaleString(dateLocale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn'
  })
}

function deviceIcon(type: Session['deviceType']) {
  switch (type) {
    case 'mobile_ios':
    case 'mobile_android':
      return 'i-lucide-smartphone'
    case 'desktop':
      return 'i-lucide-monitor'
    case 'web':
      return 'i-lucide-globe'
    default:
      return 'i-lucide-circle-help'
  }
}

function deviceLabel(s: Session) {
  return s.deviceName || t(`pages.profile.sessions.deviceType.${s.deviceType}`)
}
</script>

<template>
  <UCard :ui="{ root: 'mt-4' }">
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <h4 class="font-semibold text-base">
            {{ $t('pages.profile.sessions.title') }}
          </h4>
          <p class="text-sm text-muted">
            {{ $t('pages.profile.sessions.description') }}
          </p>
        </div>
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-log-out"
          :label="$t('pages.profile.sessions.logoutAll')"
          @click="logoutAllConfirm = true"
        />
      </div>
    </template>

    <div v-if="isLoading" class="text-center text-muted py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin w-5 h-5" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="soft"
      :title="loadError"
    />

    <div v-else-if="sessions && sessions.length === 0" class="text-center text-muted py-8">
      {{ $t('pages.profile.sessions.empty') }}
    </div>

    <div v-else-if="sessions" class="divide-y divide-default">
      <div
        v-for="s in sessions"
        :key="s.id"
        class="flex items-center gap-4 py-4"
      >
        <div class="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center shrink-0">
          <UIcon :name="deviceIcon(s.deviceType)" class="w-5 h-5 text-muted" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium truncate">{{ deviceLabel(s) }}</span>
            <UBadge v-if="s.current" color="success" variant="soft" size="sm">
              {{ $t('pages.profile.sessions.current') }}
            </UBadge>
          </div>
          <div class="text-xs text-muted flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span v-if="s.ipAddress" dir="ltr">{{ s.ipAddress }}</span>
            <span>{{ $t('pages.profile.sessions.columns.lastUsed') }}: {{ formatDate(s.lastUsedAt) }}</span>
            <span>{{ $t('pages.profile.sessions.columns.issued') }}: {{ formatDate(s.issuedAt) }}</span>
          </div>
        </div>
        <UButton
          v-if="!s.current"
          color="error"
          variant="ghost"
          icon="i-lucide-x"
          :label="$t('pages.profile.sessions.revoke')"
          size="sm"
          @click="revokeTarget = s"
        />
      </div>
    </div>

    <CommonConfirmDialog
      :open="!!revokeTarget"
      :title="$t('pages.profile.sessions.revokeConfirmTitle')"
      :message="$t('pages.profile.sessions.revokeConfirmMessage')"
      :confirm-label="$t('pages.profile.sessions.revoke')"
      destructive
      @update:open="(v) => { if (!v) revokeTarget = null }"
      @confirm="onRevokeConfirmed"
    />

    <CommonConfirmDialog
      v-model:open="logoutAllConfirm"
      :title="$t('pages.profile.sessions.logoutAllConfirmTitle')"
      :message="$t('pages.profile.sessions.logoutAllConfirmMessage')"
      :confirm-label="$t('pages.profile.sessions.logoutAll')"
      destructive
      @confirm="onLogoutAllConfirmed"
    />
  </UCard>
</template>
