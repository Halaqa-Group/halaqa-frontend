<script setup lang="ts">
definePageMeta({
  layout: 'none'
})

const route = useRoute()
const router = useRouter()

const pageNumber = computed(() => {
  const raw = Number(route.params.page)
  return Number.isFinite(raw) && raw >= 1 && raw <= 604 ? raw : 1
})

const inputPage = ref(pageNumber.value)
watch(pageNumber, p => (inputPage.value = p))

function go(delta: number) {
  const next = pageNumber.value + delta
  if (next < 1 || next > 604) return
  router.push(`/dev/mushaf/${next}`)
}

function jump() {
  const p = Number(inputPage.value)
  if (!Number.isFinite(p) || p < 1 || p > 604) return
  router.push(`/dev/mushaf/${p}`)
}

// Quick-jump landmarks for sanity-checking the renderer at a glance.
const LANDMARKS = [
  { page: 1, label: 'الفاتحة' },
  { page: 2, label: 'البقرة' },
  { page: 42, label: 'آية الكرسي' },
  { page: 255, label: 'الرعد/إبراهيم' },
  { page: 293, label: 'الكهف' },
  { page: 440, label: 'يس' },
  { page: 562, label: 'الملك' },
  { page: 604, label: 'الناس' }
]
</script>

<template>
  <div class="dev-mushaf">
    <header class="dev-mushaf__toolbar">
      <div class="dev-mushaf__nav">
        <UButton
          icon="i-lucide-chevron-right"
          variant="soft"
          size="sm"
          :disabled="pageNumber <= 1"
          @click="go(-1)"
        />
        <input
          v-model.number="inputPage"
          type="number"
          min="1"
          max="604"
          class="dev-mushaf__input"
          @keydown.enter="jump"
        >
        <UButton size="sm" variant="solid" @click="jump">
          اذهب
        </UButton>
        <UButton
          icon="i-lucide-chevron-left"
          variant="soft"
          size="sm"
          :disabled="pageNumber >= 604"
          @click="go(1)"
        />
      </div>

      <div class="dev-mushaf__landmarks">
        <UButton
          v-for="lm in LANDMARKS"
          :key="lm.page"
          size="xs"
          :variant="lm.page === pageNumber ? 'solid' : 'soft'"
          color="neutral"
          @click="router.push(`/dev/mushaf/${lm.page}`)"
        >
          {{ lm.label }} ({{ lm.page }})
        </UButton>
      </div>
    </header>

    <MushafPage :page-number="pageNumber" />
  </div>
</template>

<style scoped>
.dev-mushaf {
  min-height: 100vh;
  background: #f5f5f4;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.dev-mushaf__toolbar {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dev-mushaf__nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dev-mushaf__input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid #d6d3d1;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  text-align: center;
}

.dev-mushaf__landmarks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
</style>
