<script setup lang="ts">
// Proactive, dismissible nudge on app open asking a signed-in user to enable the
// reconnect-sync notification — but only when they haven't decided yet and only
// where Background Sync can actually deliver it. The always-available opt-in also
// lives in CommonOfflineSyncPanel; this just surfaces it so users don't have to
// discover it. Renders nothing itself (mirrors CommonPwaPrompt).
const { t } = useI18n()
const toast = useToast()
const token = useAuthToken()

// Set when the prompt is shown so an ignored nudge doesn't reappear for a week.
const SEEN_KEY = 'pwa:notify-prompt-seen'
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7

// Only meaningful where Background Sync can wake a closed app (Chromium/Android);
// hidden on iOS/Safari/Firefox — same gate as the panel opt-in.
function supported(): boolean {
  return import.meta.client
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'SyncManager' in window
}

function recentlySeen(): boolean {
  try {
    const ts = Number(localStorage.getItem(SEEN_KEY) || 0)
    return ts > 0 && Date.now() - ts < COOLDOWN_MS
  } catch {
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()))
  } catch {
    // localStorage unavailable — the in-session `shown` guard still applies.
  }
}

let shown = false

async function enable() {
  try {
    await Notification.requestPermission()
  } catch {
    // Older engines use the callback form; the support gate excludes them.
  }
}

function maybePrompt() {
  if (shown || !supported()) return
  if (!token.value) return // signed-in users only — skip the login/public pages
  if (Notification.permission !== 'default') return // already granted or denied
  if (recentlySeen()) return
  shown = true
  markSeen()
  toast.add({
    title: t('pwa.notifyPromptTitle'),
    description: t('pwa.notifyPromptBody'),
    icon: 'i-lucide-bell',
    color: 'primary',
    duration: 0,
    orientation: 'horizontal',
    actions: [{ label: t('pwa.notifyEnable'), onClick: enable }]
  })
}

// Give first paint / any auth redirect a moment before nudging.
onMounted(() => {
  const id = setTimeout(maybePrompt, 2500)
  onBeforeUnmount(() => clearTimeout(id))
})

// If they weren't signed in at mount (login → redirect), nudge once they are.
watch(token, value => value && maybePrompt())
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
