import { CAPACITY_UNITS, type StudentCapacityUnit } from '~/data/constants'

/**
 * وحدة القدرة اليومية — labels and select items for the unit each daily capacity
 * number is counted in. Mirrors the backend CAPACITY_UNITS enum; the label text
 * lives under `pages.students.capacityUnits.*` in the locale files.
 */
export function useCapacityUnits() {
  const { t } = useI18n()

  function unitLabel(unit: StudentCapacityUnit | string | null | undefined): string {
    if (!unit) return ''
    return t(`pages.students.capacityUnits.${unit}`)
  }

  const unitItems = computed(() =>
    CAPACITY_UNITS.map(value => ({ value, label: unitLabel(value) }))
  )

  return { unitLabel, unitItems }
}
