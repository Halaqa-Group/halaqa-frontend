import { useOnline } from '@vueuse/core'

// Automatically caches the selected halaqa's teacher-work data (roster, plans,
// memorization, settings, today's attendance + achievements) in the background
// whenever we're online — so attendance, achievements, planner and the record
// form work offline by default, without anyone tapping "Make available offline".
// Throttled per halaqa inside useHalaqaOfflineCache (autoWarm).
export default defineNuxtPlugin(() => {
  const { selectedHalaqaId } = useGlobalHalaqa()
  const { autoWarm } = useHalaqaOfflineCache()
  const online = useOnline()

  function maybeWarm() {
    const id = selectedHalaqaId.value
    if (id != null && online.value) void autoWarm(id)
  }

  // Fires when the halaqa resolves (null → id) after login/init, on switch, and
  // when connectivity returns.
  watch(selectedHalaqaId, maybeWarm)
  watch(online, (isOnline) => {
    if (isOnline) maybeWarm()
  })

  if (online.value && selectedHalaqaId.value != null) maybeWarm()
})
