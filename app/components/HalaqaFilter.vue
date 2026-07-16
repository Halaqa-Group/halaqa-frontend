<script setup lang="ts">
// In-page halaqa filter for roles that browse unscoped (principal, vice_principal,
// supervisor) and therefore have no navbar HalaqaMenu. Scoped roles already sit on
// one halaqa chosen there, so this renders nothing for them.
// `required` drops the "all" option — use it on pages whose API calls demand a
// halaqa_id (planner, achievement recording).
const props = defineProps<{ required?: boolean }>()

const { t } = useI18n()
const { halaqat, selectedHalaqaId, isHalaqaScoped, selectHalaqa, selectAllHalaqat } = useGlobalHalaqa()

const ALL = -1

const items = computed(() => {
  const options = halaqat.value.map(h => ({ label: h.name, value: h.id }))
  return props.required ? options : [{ label: t('common.allHalaqat'), value: ALL }, ...options]
})

const model = computed<number | undefined>({
  get: () => selectedHalaqaId.value ?? (props.required ? undefined : ALL),
  set: (value) => {
    if (value === undefined || value === ALL) {
      selectAllHalaqat()
      return
    }
    const halaqa = halaqat.value.find(h => h.id === value)
    if (halaqa) selectHalaqa(halaqa)
  }
})
</script>

<template>
  <USelect
    v-if="!isHalaqaScoped"
    v-model="model"
    :items="items"
    value-key="value"
    icon="i-lucide-layers"
    :placeholder="t('common.selectHalaqa')"
    class="w-full sm:w-56"
  />
</template>
