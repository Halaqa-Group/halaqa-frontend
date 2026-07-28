<script setup lang="ts">
// TEMPORARY scratch harness — delete after verifying the /recite reader.
import type { MarkGroups, RecitationMarks, Severity, WordKey } from '~/types/recitation'

definePageMeta({ layout: 'none' })

const q = useRoute().query
const START = {
  surah: Number(q.ss ?? 73),
  verse: Number(q.sv ?? 20),
  endSurah: Number(q.es ?? 74),
  endVerse: Number(q.ev ?? 17)
}

const sheetOpen = ref(false)
const marks = ref<RecitationMarks>({})
const groups = ref<MarkGroups>({})

const viewerRef = ref<{
  goToVerse: (v: string) => void
  currentPage: number | undefined
  pages: number[]
  canPrev: boolean
  canNext: boolean
  prev: () => void
  next: () => void
} | null>(null)

const currentPage = computed(() => viewerRef.value?.currentPage)
const lessonPageCount = computed(() => viewerRef.value?.pages.length ?? 0)
const pagePosition = computed(() => {
  const pages = viewerRef.value?.pages
  const page = currentPage.value
  if (!pages || !page) return 0
  return pages.indexOf(page) + 1
})

const { surahName, juz, hizb } = useMushafPageMeta(currentPage)

const ORDER: Severity[] = ['severe', 'light', 'minor']
function onWordTap(key: WordKey) {
  const cur = marks.value[key]
  const next = cur == null ? ORDER[0] : ORDER[ORDER.indexOf(cur) + 1]
  const copy = { ...marks.value }
  if (next) copy[key] = next
  else delete copy[key]
  marks.value = copy
}
function onWordsMark(keys: WordKey[], severity: Severity | null) {
  const copy = { ...marks.value }
  const g = { ...groups.value }
  const id = `g${keys[0]}`
  for (const k of keys) {
    if (severity) {
      copy[k] = severity
      g[k] = id
    } else {
      delete copy[k]
      delete g[k]
    }
  }
  marks.value = copy
  groups.value = g
}

const counts = computed(() => {
  const c = { severe: 0, light: 0, minor: 0, total: 0 }
  for (const v of Object.values(marks.value)) {
    c[v]++
    c.total++
  }
  return c
})
</script>

<template>
  <div class="reader">
    <MushafReaderTopBar :surah-name="surahName" :juz="juz" @back="() => {}" @menu="() => {}" />

    <div class="reader__body">
      <MushafRangeViewer
        ref="viewerRef"
        :start-surah="START.surah"
        :start-verse="START.verse"
        :end-surah="START.endSurah"
        :end-verse="START.endVerse"
        :marks="marks"
        :groups="groups"
        :on-word-tap="onWordTap"
        :on-words-mark="onWordsMark"
      />
    </div>

    <MushafReaderBottomSheet
      v-model:expanded="sheetOpen"
      :page="currentPage"
      :hizb="hizb"
      :score="94"
      sync-status="saved"
      sync-label="محفوظ"
      :show-sync="true"
      :position="pagePosition"
      :total-pages="lessonPageCount"
      :can-prev="viewerRef?.canPrev"
      :can-next="viewerRef?.canNext"
      :show-finish="true"
      @prev="viewerRef?.prev()"
      @next="viewerRef?.next()"
    >
      <MushafMarkSummary :counts="counts" />

      <template #actions>
        <MushafMarkToolbar
          :counts="counts"
          :can-submit="true"
          @clear="marks = {}; groups = {}"
          @save="() => {}"
          @submit="() => {}"
        />
      </template>
    </MushafReaderBottomSheet>
  </div>
</template>

<style scoped>
.reader {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--color-mushaf-bg);
}

.reader__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
</style>
