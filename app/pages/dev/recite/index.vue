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
    router.replace({ query: { ss, sv, es, ev } })
  }
)
watch(
  () => route.query,
  () => {
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

const sessionId = computed(() =>
  `dev:${startSurah.value}-${startVerse.value}_${endSurah.value}-${endVerse.value}`
)

const { mode, marks, counts, tap, clearAll } = useRecitationSession(sessionId)

const toast = useToast()
function onSubmit() {
  const c = counts.value
  toast.add({
    title: 'حُفظ التقييم محلياً',
    description: `${c.mistake} خطأ، ${c.warning} تنبيه، ${c.tajweed} تجويد`,
    color: 'success',
    duration: 3000
  })
}

const PRESETS = [
  { label: 'الفاتحة كاملة', ss: 1, sv: 1, es: 1, ev: 7 },
  { label: 'آية الكرسي', ss: 2, sv: 255, es: 2, ev: 255 },
  { label: 'سورة الإخلاص', ss: 112, sv: 1, es: 112, ev: 4 },
  { label: 'يس 1-12', ss: 36, sv: 1, es: 36, ev: 12 }
]
function applyPreset(p: typeof PRESETS[number]) {
  startSurah.value = p.ss
  startVerse.value = p.sv
  endSurah.value = p.es
  endVerse.value = p.ev
}
</script>

<template>
  <div class="dev-recite">
    <header class="dev-recite__toolbar" dir="rtl">
      <div class="dev-recite__inputs">
        <div class="dev-recite__field">
          <label>من سورة</label>
          <USelect v-model="startSurah" :items="surahOptions" size="sm" />
        </div>
        <div class="dev-recite__field">
          <label>من آية</label>
          <input v-model.number="startVerse" type="number" min="1" :max="maxStartVerse" class="dev-recite__input">
        </div>
        <div class="dev-recite__field">
          <label>إلى سورة</label>
          <USelect v-model="endSurah" :items="surahOptions" size="sm" />
        </div>
        <div class="dev-recite__field">
          <label>إلى آية</label>
          <input v-model.number="endVerse" type="number" min="1" :max="maxEndVerse" class="dev-recite__input">
        </div>
      </div>
      <div class="dev-recite__presets">
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

    <div class="dev-recite__sticky">
      <MushafMarkToolbar
        :mode="mode"
        :counts="counts"
        :can-submit="counts.total > 0"
        @update:mode="mode = $event"
        @clear="clearAll"
        @submit="onSubmit"
      />
    </div>

    <MushafRangeViewer
      :start-surah="startSurah"
      :start-verse="startVerse"
      :end-surah="endSurah"
      :end-verse="endVerse"
      :marks="marks"
      :on-word-tap="tap"
    />
  </div>
</template>

<style scoped>
.dev-recite {
  min-height: 100vh;
  background: #f5f5f4;
  padding: clamp(0.5rem, 2vw, 1rem);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.dev-recite__toolbar {
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

.dev-recite__inputs {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1.4fr 0.8fr;
  gap: 0.4rem;
}

@media (max-width: 540px) {
  .dev-recite__inputs {
    grid-template-columns: 1.4fr 0.8fr;
  }
}

.dev-recite__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dev-recite__field label {
  font-size: 0.75rem;
  color: #78716c;
  font-family: 'Thmanyah Sans', serif;
}

.dev-recite__input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d6d3d1;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
}

.dev-recite__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.dev-recite__sticky {
  position: sticky;
  top: 0.5rem;
  z-index: 10;
}
</style>
