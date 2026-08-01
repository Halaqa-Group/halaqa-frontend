import { ref, computed } from 'vue'
import type { ApiHalaqaListItem } from '~/types'

// Persisted so an offline reload keeps the user's halaqa — the full object is
// re-resolved from the (cached) halaqat list, but the id + view-all choice
// survive in localStorage.
const SELECTION_KEY = 'halaqa:selection'

function readStoredSelection(): { id: number | null, viewAll: boolean } | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(SELECTION_KEY)
    return raw ? JSON.parse(raw) as { id: number | null, viewAll: boolean } : null
  } catch {
    return null
  }
}

function writeStoredSelection(id: number | null, viewAll: boolean) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ id, viewAll }))
  } catch {
    // Storage unavailable (private mode / quota) — selection just won't persist.
  }
}

const storedSelection = readStoredSelection()
const selectedHalaqa = ref<ApiHalaqaListItem | null>(null)
const viewAllHalaqat = ref(storedSelection?.viewAll ?? false)
// Only the id survives a reload; the object is resolved once the list loads.
const storedSelectedId = ref<number | null>(storedSelection?.id ?? null)

function persistSelection() {
  storedSelectedId.value = selectedHalaqa.value?.id ?? null
  writeStoredSelection(storedSelectedId.value, viewAllHalaqat.value)
}

// Roles that work inside a single halaqa at a time and pick it from the navbar.
// Everyone else (principal, vice_principal, supervisor) browses unscoped: the API
// scopes every list to what the caller may see, so omitting halaqa_id is the
// "whole school" query for an admin and "all my halaqat" for a supervisor. Those
// roles narrow down per page via <HalaqaFilter> instead.
const SCOPED_ROLES = ['teacher']

export function useGlobalHalaqa() {
  const { halaqat, fetchHalaqat, isLoading } = useHalaqat()
  const { activeRole } = useAuth()

  const isHalaqaScoped = computed(() => SCOPED_ROLES.includes(activeRole.value ?? ''))

  async function initializeHalaqa() {
    await fetchHalaqat({ status: 'active', limit: 100 })
    const list = halaqat.value
    // Prefer an in-session selection, else the one restored from localStorage.
    const preferredId = selectedHalaqa.value?.id ?? storedSelectedId.value

    if (!isHalaqaScoped.value) {
      // Keep a filter the user already set, as long as it still resolves.
      const found = preferredId != null ? list.find(h => h.id === preferredId) : undefined
      selectedHalaqa.value = found ?? null
      viewAllHalaqat.value = !found
      persistSelection()
      return
    }

    viewAllHalaqat.value = false
    if (list.length === 0) {
      selectedHalaqa.value = null
      persistSelection()
      return
    }
    if (preferredId != null) {
      const found = list.find(h => h.id === preferredId)
      if (found) {
        selectedHalaqa.value = found
        persistSelection()
        return
      }
    }
    selectedHalaqa.value = list[0]!
    persistSelection()
  }

  function selectHalaqa(halaqa: ApiHalaqaListItem) {
    selectedHalaqa.value = halaqa
    viewAllHalaqat.value = false
    persistSelection()
  }

  // Pages whose API calls demand a halaqa_id (planner, achievement recording) call
  // this so unscoped roles land on their first halaqa instead of an empty state.
  // The list is already scoped by the API to what the caller may see, so list[0] is
  // "the first halaqa I'm assigned to". Returns null only when there is none.
  // May run before the layout's initializeHalaqa (pages mount before layouts), so
  // it fetches the list itself when empty.
  async function ensureHalaqaSelected(): Promise<ApiHalaqaListItem | null> {
    if (selectedHalaqa.value) return selectedHalaqa.value
    if (halaqat.value.length === 0) await fetchHalaqat({ status: 'active', limit: 100 })
    // A concurrent initializeHalaqa may have settled the scope while we fetched.
    if (selectedHalaqa.value) return selectedHalaqa.value
    const first = halaqat.value[0]
    if (first) selectHalaqa(first)
    return first ?? null
  }

  function selectAllHalaqat() {
    viewAllHalaqat.value = true
    selectedHalaqa.value = null
    persistSelection()
  }

  const hasHalaqa = computed(() => selectedHalaqa.value !== null || viewAllHalaqat.value)
  const selectedHalaqaId = computed(() => selectedHalaqa.value?.id ?? null)
  const selectedHalaqaName = computed(() => {
    if (viewAllHalaqat.value) return 'كل الحلقات'
    return selectedHalaqa.value?.name ?? 'اختر الحلقة'
  })

  return {
    selectedHalaqa,
    selectedHalaqaId,
    selectedHalaqaName,
    viewAllHalaqat,
    hasHalaqa,
    isHalaqaScoped,
    halaqat,
    isLoading,

    initializeHalaqa,
    ensureHalaqaSelected,
    selectHalaqa,
    selectAllHalaqat
  }
}
