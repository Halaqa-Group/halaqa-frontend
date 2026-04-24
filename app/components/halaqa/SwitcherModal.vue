<script setup lang="ts">
import type { ApiHalaqa } from '~/types'

const { selectedHalaqa, halaqat, isModalOpen, selectHalaqa, closeModal } = useGlobalHalaqa()

// Halaqa type icons
const typeIcons: Record<string, string> = {
  'Memorization': 'i-lucide-book-open',
  'Tajweed': 'i-lucide-mic',
  'Aqeedah': 'i-lucide-book-text'
}

// Halaqa type colors
const typeColors: Record<string, { bg: string; text: string }> = {
  'Memorization': { bg: '#E0F0EE', text: '#4A8E85' },
  'Tajweed': { bg: '#E3F2FD', text: '#2196F3' },
  'Aqeedah': { bg: '#FFF3E0', text: '#F57C00' }
}

// Halaqa type labels in Arabic
const typeLabels: Record<string, string> = {
  'Memorization': 'حفظ',
  'Tajweed': 'تجويد',
  'Aqeedah': 'عقيدة'
}

function getTypeIcon(type: string) {
  return typeIcons[type] || 'i-lucide-circle'
}

function getTypeColor(type: string) {
  return typeColors[type] || { bg: '#F0F0F0', text: '#666666' }
}

function getTypeLabel(type: string) {
  return typeLabels[type] || type
}

function isSelected(halaqa: ApiHalaqa) {
  return selectedHalaqa.value?.id === halaqa.id
}

function handleSelect(halaqa: ApiHalaqa) {
  selectHalaqa(halaqa)
}
</script>

<template>
  <UModal
    v-model:open="isModalOpen"
    :ui="{
      content: 'sm:max-w-3xl max-h-[90vh] overflow-hidden rounded-[32px] p-0',
      overlay: 'backdrop-blur-md'
    }"
    @close="closeModal"
  >
    <template #content>
      <div class="flex flex-col">
        <!-- Modal Header -->
        <div class="px-8 pt-10 pb-6 text-center">
          <h2 class="text-2xl font-arabic font-bold mb-2" style="color: var(--color-on-surface);">
            اختر الحلقة للمتابعة
          </h2>
          <p class="body-md font-arabic" style="color: var(--color-on-surface-variant);">
            تبديل بين حلقات الدراسة والمجموعات النشطة
          </p>
        </div>

        <!-- Halaqa Grid -->
        <div class="px-8 py-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <!-- Halaqa Cards -->
            <button
              v-for="halaqa in halaqat"
              :key="halaqa.id"
              class="relative rounded-3xl p-6 flex flex-col items-center text-center transition-all duration-300 cursor-pointer"
              :class="isSelected(halaqa)
                ? 'border-2 shadow-lg'
                : 'border border-gray-200 hover:border-primary/30 hover:shadow-lg'"
              :style="isSelected(halaqa)
                ? `background-color: ${getTypeColor(halaqa.type).bg}; border-color: ${getTypeColor(halaqa.type).text};`
                : 'background-color: white;'"
              @click="handleSelect(halaqa)"
            >
              <!-- Selected Indicator -->
              <div
                v-if="isSelected(halaqa)"
                class="absolute top-3 left-3"
                :style="`color: ${getTypeColor(halaqa.type).text};`"
              >
                <UIcon name="i-lucide-check-circle" class="w-5 h-5" style="fill: currentColor;" />
              </div>

              <!-- Icon -->
              <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                :style="isSelected(halaqa)
                  ? 'background-color: white;'
                  : `background-color: ${getTypeColor(halaqa.type).bg};`"
              >
                <UIcon
                  :name="getTypeIcon(halaqa.type)"
                  class="w-8 h-8"
                  :style="`color: ${getTypeColor(halaqa.type).text};`"
                />
              </div>

              <!-- Halaqa Name -->
              <h3
                class="text-lg font-arabic font-bold mb-1"
                :style="isSelected(halaqa)
                  ? `color: ${getTypeColor(halaqa.type).text};`
                  : 'color: var(--color-on-surface);'"
              >
                {{ halaqa.name }}
              </h3>

              <!-- Type Label -->
              <span
                class="text-xs font-bold font-arabic"
                style="color: var(--color-on-surface-variant);"
              >
                {{ getTypeLabel(halaqa.type) }}
              </span>
            </button>

            <!-- Create New Placeholder (Optional - can be removed if not needed) -->
            <button
              class="border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-white transition-all duration-300"
              style="background-color: #f9f9f9;"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-white"
                style="color: var(--color-on-surface-variant);"
              >
                <UIcon name="i-lucide-plus" class="w-6 h-6" />
              </div>
              <h3 class="text-sm font-arabic font-bold" style="color: var(--color-on-surface-variant);">
                إضافة جديد
              </h3>
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="mt-auto px-8 py-8 flex items-center justify-between"
          style="border-top: 1px solid var(--color-outline-variant);"
        >
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-arabic cursor-pointer"
            style="color: var(--color-on-surface-variant);"
            @click="closeModal"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
            <span>إلغاء</span>
          </button>

          <button
            class="font-arabic font-bold text-sm px-6 py-2.5 rounded-full text-white transition-opacity hover:opacity-90 cursor-pointer"
            style="background-color: var(--color-primary);"
            @click="closeModal"
          >
            تأكيد الاختيار
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
