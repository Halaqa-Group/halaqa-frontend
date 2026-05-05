import { ref, computed } from 'vue'
import type { ApiHalaqa } from '~/types'

// Global state for selected halaqa (persists across all pages)
const selectedHalaqa = ref<ApiHalaqa | null>(null)
const isModalOpen = ref(false)

export function useGlobalHalaqa() {
  const { halaqat, fetchHalaqat, isLoading } = useHalaqat()

  /** Loads halaqat and keeps the selected halaqa in sync with the list (after CRUD or refresh). */
  async function initializeHalaqa() {
    await fetchHalaqat()
    const list = halaqat.value
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

  function selectHalaqa(halaqa: ApiHalaqa) {
    selectedHalaqa.value = halaqa
    closeModal()
  }

  function openModal() {
    isModalOpen.value = true
  }

  function closeModal() {
    isModalOpen.value = false
  }

  const hasHalaqa = computed(() => selectedHalaqa.value !== null)
  const selectedHalaqaId = computed(() => selectedHalaqa.value?.id ?? null)
  const selectedHalaqaName = computed(() => selectedHalaqa.value?.name ?? 'اختر الحلقة')

  return {
    // State
    selectedHalaqa,
    selectedHalaqaId,
    selectedHalaqaName,
    hasHalaqa,
    halaqat,
    isLoading,
    isModalOpen,

    // Methods
    initializeHalaqa,
    selectHalaqa,
    openModal,
    closeModal
  }
}
