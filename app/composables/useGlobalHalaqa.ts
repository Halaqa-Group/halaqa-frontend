import { ref, computed } from 'vue'
import type { ApiHalaqaListItem } from '~/types'

const selectedHalaqa = ref<ApiHalaqaListItem | null>(null)
const viewAllHalaqat = ref(false)

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

    if (!isHalaqaScoped.value) {
      // Keep a filter the user already set, as long as it still resolves.
      const sid = selectedHalaqa.value?.id
      const found = sid != null ? list.find(h => h.id === sid) : undefined
      selectedHalaqa.value = found ?? null
      viewAllHalaqat.value = !found
      return
    }

    viewAllHalaqat.value = false
    if (list.length === 0) {
      selectedHalaqa.value = null
      return
    }
    const sid = selectedHalaqa.value?.id
    if (sid != null) {
      const found = list.find(h => h.id === sid)
      if (found) {
        selectedHalaqa.value = found
        return
      }
    }
    selectedHalaqa.value = list[0]!
  }

  function selectHalaqa(halaqa: ApiHalaqaListItem) {
    selectedHalaqa.value = halaqa
    viewAllHalaqat.value = false
  }

  function selectAllHalaqat() {
    viewAllHalaqat.value = true
    selectedHalaqa.value = null
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
    selectHalaqa,
    selectAllHalaqat
  }
}
