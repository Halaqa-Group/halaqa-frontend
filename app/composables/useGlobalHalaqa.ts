import { ref, computed } from 'vue'
import type { ApiHalaqaListItem } from '~/types'

// Global state for selected halaqa (persists across all pages)
const selectedHalaqa = ref<ApiHalaqaListItem | null>(null)
const viewAllHalaqat = ref(false)

export function useGlobalHalaqa() {
  const { halaqat, fetchHalaqat, isLoading } = useHalaqat()

  /** Loads halaqat and keeps the selected halaqa in sync with the list (after CRUD or refresh). */
  async function initializeHalaqa() {
    await fetchHalaqat({ status: 'active', limit: 100 })
    const list = halaqat.value
    if (list.length === 0) {
      selectedHalaqa.value = null
      return
    }
    if (viewAllHalaqat.value) return
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
    // State
    selectedHalaqa,
    selectedHalaqaId,
    selectedHalaqaName,
    viewAllHalaqat,
    hasHalaqa,
    halaqat,
    isLoading,

    // Methods
    initializeHalaqa,
    selectHalaqa,
    selectAllHalaqat
  }
}
