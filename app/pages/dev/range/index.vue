<script setup lang="ts">
import { SURAH_NAMES } from '~/data/constants'
import { VERSE_COUNTS } from '~/utils/quran'

definePageMeta({ layout: 'none' })

const route = useRoute()
const router = useRouter()

function parseQ(key: string, fallback: number): number {
  const raw = route.query[key]
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const startSurah = ref(parseQ('ss', 1))
const startVerse = ref(parseQ('sv', 1))
const endSurah = ref(parseQ('es', 1))
const endVerse = ref(parseQ('ev', 7))

watch(
  [startSurah, startVerse, endSurah, endVerse],
  ([ss, sv, es, ev]) => {
    router.replace({
      query: { ss, sv, es, ev }
    })
  }
)

watch(
  () => route.query,
  (q) => {
    const ss = parseQ('ss', startSurah.value)
    const sv = parseQ('sv', startVerse.value)
    const es = parseQ('es', endSurah.value)
    const ev = parseQ('ev', endVerse.value)
    if (ss !== startSurah.value) startSurah.value = ss
    if (sv !== startVerse.value) startVerse.value = sv
    if (es !== endSurah.value) endSurah.value = es
    if (ev !== endVerse.value) endVerse.value = ev
  }
)

const surahOptions = computed(() =>
  Object.entries(SURAH_NAMES).map(([num, name]) => ({
    value: Number(num),
    label: `${num}. ${name}`
  }))
)

const maxStartVerse = computed(() => VERSE_COUNTS[startSurah.value] ?? 1)
const maxEndVerse = computed(() => VERSE_COUNTS[endSurah.value] ?? 1)

watch(maxStartVerse, (m) => { if (startVerse.value > m) startVerse.value = m })
watch(maxEndVerse, (m) => { if (endVerse.value > m) endVerse.value = m })

const PRESETS = [
  { label: 'الفاتحة كاملة', ss: 1, sv: 1, es: 1, ev: 7 },
  { label: 'آية الكرسي', ss: 2, sv: 255, es: 2, ev: 255 },
  { label: 'سورة الإخلاص', ss: 112, sv: 1, es: 112, ev: 4 },
  { label: 'الكهف 1-10', ss: 18, sv: 1, es: 18, ev: 10 },
  { label: 'يس كاملة', ss: 36, sv: 1, es: 36, ev: 83 },
  { label: 'الناس + الفلق', ss: 113, sv: 1, es: 114, ev: 6 }
]

function applyPreset(p: typeof PRESETS[number]) {
  startSurah.value = p.ss
  startVerse.value = p.sv
  endSurah.value = p.es
  endVerse.value = p.ev
}
</script>

<template>
  <div class="dev-range">
    <header class="dev-range__toolbar" dir="rtl">
      <div class="dev-range__inputs">
        <div class="dev-range__field">
          <label>من سورة</label>
          <USelect v-model="startSurah" :items="surahOptions" size="sm" />
        </div>
        <div class="dev-range__field">
          <label>من آية</label>
          <input v-model.number="startVerse" type="number" min="1" :max="maxStartVerse" class="dev-range__input">
        </div>
        <div class="dev-range__field">
          <label>إلى سورة</label>
          <USelect v-model="endSurah" :items="surahOptions" size="sm" />
        </div>
        <div class="dev-range__field">
          <label>إلى آية</label>
          <input v-model.number="endVerse" type="number" min="1" :max="maxEndVerse" class="dev-range__input">
        </div>
      </div>

      <div class="dev-range__presets">
        <UButton
          v-for="p in PRESETS"
          :key="p.label"
          size="xs"
          variant="soft"
          color="neutral"
          @click="applyPreset(p)"
        >
          {{ p.label }}
        </UButton>
      </div>
    </header>

    <MushafRangeViewer
      :start-surah="startSurah"
      :start-verse="startVerse"
      :end-surah="endSurah"
      :end-verse="endVerse"
    />
  </div>
</template>

<style scoped>
.dev-range {
  min-height: 100vh;
  background: #f5f5f4;
  padding: clamp(0.5rem, 2vw, 1rem);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.dev-range__toolbar {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: white;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  padding: 0.6rem;
}

.dev-range__inputs {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1.4fr 0.8fr;
  gap: 0.4rem;
}

@media (max-width: 540px) {
  .dev-range__inputs {
    grid-template-columns: 1.4fr 0.8fr;
  }
}

.dev-range__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dev-range__field label {
  font-size: 0.75rem;
  color: #78716c;
  font-family: 'Thmanyah Sans', serif;
}

.dev-range__input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d6d3d1;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
}

.dev-range__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
</style>
