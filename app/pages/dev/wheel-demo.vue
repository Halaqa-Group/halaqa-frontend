<script setup lang="ts">
// TEMP sandbox for verifying the reference-styled wheel range picker.
definePageMeta({ layout: 'none' })

const range = reactive({ start_surah: 21, start_verse: 36, end_surah: 21, end_verse: 40 })

const studentId = ref<number | undefined>(undefined)
const studentItems = [
  { label: 'أحمد محمد', value: 1 },
  { label: 'يوسف عبدالله', value: 2 },
  { label: 'خالد إبراهيم', value: 3 },
  { label: 'عمر حسن', value: 4 },
  { label: 'زيد سالم', value: 5 }
]
</script>

<template>
  <div dir="rtl" class="min-h-screen bg-default p-4">
    <div class="mx-auto max-w-md space-y-6">
      <h1 class="text-lg font-semibold text-highlighted">
        إعدادات التشغيل الصوتي
      </h1>
      <div class="grid grid-cols-1 gap-3">
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">الطالب</span>
          <CommonWheelSelect v-model="studentId" :items="studentItems" placeholder="اختر الطالب" aria-label="الطالب" />
        </div>
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">بدء من الآية</span>
          <PlannerAyahSelect v-model:surah="range.start_surah" v-model:verse="range.start_verse" />
        </div>
        <div class="space-y-1">
          <span class="text-xs font-medium text-muted">إلى الآية</span>
          <PlannerAyahSelect v-model:surah="range.end_surah" v-model:verse="range.end_verse" :min-surah="range.start_surah" snap-to="last" />
        </div>
      </div>
      <pre class="rounded bg-elevated p-3 text-xs text-default">{{ JSON.stringify({ studentId, ...range }) }}</pre>
    </div>
  </div>
</template>
