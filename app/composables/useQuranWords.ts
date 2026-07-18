import { ensureQuranWordData, isQuranWordDataReady } from '~/utils/quran-words'

// Warms the QUL word-id + juz/hizb lookup (used to locate achievement errors)
// and exposes when it's ready. The helpers themselves are the module-level
// functions in `~/utils/quran-words`; this composable just triggers the load so
// the data is warm before an achievement is submitted.
export function useQuranWords() {
  const ready = ref(isQuranWordDataReady())

  if (!ready.value && import.meta.client) {
    ensureQuranWordData().then((ok) => {
      ready.value = ok
    })
  }

  return { ready: readonly(ready), ensureQuranWordData }
}
