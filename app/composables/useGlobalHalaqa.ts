import { ref, computed } from 'vue'
import type { ApiHalaqa } from '~/types'

// Global state for selected halaqa (persists across all pages)
const selectedHalaqa = ref<ApiHalaqa | null>(null)
const isModalOpen = ref(false)

export function useGlobalHalaqa() {
  const { halaqat, fetchHalaqat, isLoading } = useHalaqat()

  // Auto-select first halaqa if none selected
  async function initializeHalaqa() {
    await fetchHalaqat()
    const firstHalaqa = halaqat.value[0]
    if (!selectedHalaqa.value && firstHalaqa) {
      selectedHalaqa.value = firstHalaqa
    }
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
