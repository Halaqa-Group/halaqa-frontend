import { ref, computed } from 'vue'
import type { ListHalaqatQuery } from '~/composables/useHalaqat'
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

// The navbar's halaqa list. Kept separate from useHalaqat().halaqat — that ref is
// a shared singleton any page can overwrite with a broader query (the halaqat
// admin list, analytics, the student form modal…). Reading it directly let those
// fetches "reset" the navbar to every halaqa. This copy is only ever written by
// the role-scoped fetch in initializeHalaqa, so the navbar stays stable.
const globalHalaqat = ref<ApiHalaqaListItem[]>([])

function persistSelection() {
  storedSelectedId.value = selectedHalaqa.value?.id ?? null
  writeStoredSelection(storedSelectedId.value, viewAllHalaqat.value)
}

// Roles that default to a single halaqa at a time. Everyone else (principal,
// vice_principal, supervisor) browses unscoped: the API scopes every list to what
// the caller may see, so omitting halaqa_id is the "whole school" query for an
// admin and "all my halaqat" for a supervisor. Both pick/narrow from the navbar
// HalaqaMenu, which also offers an "all halaqat" option to anyone assigned to more
// than one.
const SCOPED_ROLES = ['teacher']

export function useGlobalHalaqa() {
  const { fetchHalaqat, isLoading } = useHalaqat()
  const { activeRole, user } = useAuth()

  const isHalaqaScoped = computed(() => SCOPED_ROLES.includes(activeRole.value ?? ''))

  // /halaqat is scoped server-side by the UNION of the user's roles, so a
  // supervisor-and-teacher acting as teacher would otherwise see the halaqat
  // they supervise in the header too. When acting as teacher, constrain the
  // list to the ones they actually teach (main/assistant/substitute) by asking
  // the backend to filter on their own id.
  function baseListQuery(): ListHalaqatQuery {
    const query: ListHalaqatQuery = { status: 'active', limit: 100 }
    if (activeRole.value === 'teacher' && user.value?.id != null) {
      query.teacher_user_id = user.value.id
    }
    return query
  }

  async function initializeHalaqa() {
    // Use the fetch result directly (not the shared halaqat ref) so a concurrent
    // broad fetch from another page can't slip its list into the navbar.
    const result = await fetchHalaqat(baseListQuery())
    globalHalaqat.value = result.items
    const list = globalHalaqat.value
    // "All" is only meaningful when the user can see more than one halaqa.
    const hasMultiple = list.length > 1
    // Prefer an in-session selection, else the one restored from localStorage.
    const preferredId = selectedHalaqa.value?.id ?? storedSelectedId.value

    // Honor an explicit "all halaqat" choice for anyone (scoped or not) with more
    // than one halaqa. This runs on every mount/role-switch, so without this the
    // scoped branch below would silently reset a teacher's "All" back to one halaqa.
    if (viewAllHalaqat.value && hasMultiple) {
      selectedHalaqa.value = null
      viewAllHalaqat.value = true
      persistSelection()
      return
    }

    // Keep a specific halaqa the user already picked, as long as it still resolves.
    const found = preferredId != null ? list.find(h => h.id === preferredId) : undefined
    if (found) {
      selectedHalaqa.value = found
      viewAllHalaqat.value = false
      persistSelection()
      return
    }

    // Nothing chosen yet — fall back to the role's default scope. Scoped roles
    // (teacher) land on their first halaqa; everyone else browses all of them.
    if (isHalaqaScoped.value) {
      selectedHalaqa.value = list[0] ?? null
      viewAllHalaqat.value = false
    } else {
      selectedHalaqa.value = null
      viewAllHalaqat.value = list.length > 0
    }
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
    // Resolve the scope through initializeHalaqa (role-scoped, and the sole writer
    // of globalHalaqat) rather than a bare fetch — otherwise this eager, pre-layout
    // call could seed the navbar with an unscoped list.
    if (globalHalaqat.value.length === 0) await initializeHalaqa()
    // initializeHalaqa may have settled a selection (or "all") already.
    if (selectedHalaqa.value) return selectedHalaqa.value
    // Still nothing pinned (e.g. an unscoped role defaulted to "all") — the caller
    // needs a concrete halaqa, so land on the first one in scope.
    const first = globalHalaqat.value[0]
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
    halaqat: globalHalaqat,
    isLoading,

    initializeHalaqa,
    ensureHalaqaSelected,
    selectHalaqa,
    selectAllHalaqat
  }
}
