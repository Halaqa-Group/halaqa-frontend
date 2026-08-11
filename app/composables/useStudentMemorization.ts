import type { ApiMemorization, EditMemorizationInput } from '~/types'
import {
  decodeBitmap,
  decodeRanges,
  memorizedPredicate,
  TOTAL_AYAT,
  type MemorizedRange
} from '~/utils/memorization'

export function useStudentMemorization(studentId: MaybeRefOrGetter<number | string>) {
  const api = useApi()
  const apiError = useApiError()

  const bitmap = ref<Uint8Array>(new Uint8Array(0))
  const count = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const ranges = computed<MemorizedRange[]>(() => decodeRanges(bitmap.value))
  const predicate = computed(() => memorizedPredicate(bitmap.value))
  const percentage = computed(() =>
    TOTAL_AYAT > 0 ? Math.round((count.value / TOTAL_AYAT) * 1000) / 10 : 0
  )

  function apply(data: ApiMemorization) {
    bitmap.value = decodeBitmap(data.bitmap_base64)
    count.value = data.memorized_ayah_count
  }

  async function load() {
    const id = toValue(studentId)
    loading.value = true
    error.value = null
    try {
      apply(await api<ApiMemorization>(`/students/${id}/memorization`))
    } catch (e) {
      error.value = apiError.format(e, 'تعذّر تحميل بيانات الحفظ')
      // Never leave the previously loaded student's bitmap on screen under this
      // student's name — offline, a student who was never cached fails here.
      bitmap.value = new Uint8Array(0)
      count.value = 0
    } finally {
      loading.value = false
    }
  }

  async function edit(body: EditMemorizationInput) {
    const id = toValue(studentId)
    saving.value = true
    error.value = null
    try {
      apply(await api<ApiMemorization>(`/students/${id}/memorization`, {
        method: 'PUT',
        body
      }))
      return true
    } catch (e) {
      error.value = apiError.format(e, 'تعذّر حفظ التعديل')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    bitmap: readonly(bitmap),
    count: readonly(count),
    percentage,
    ranges,
    predicate,
    loading: readonly(loading),
    saving: readonly(saving),
    error: readonly(error),
    load,
    edit
  }
}
