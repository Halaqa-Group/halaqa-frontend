<script setup lang="ts">
import type { ApiHalaqa } from '~/types'

const { selectedHalaqa, halaqat, isModalOpen, selectHalaqa, closeModal } = useGlobalHalaqa()

const TYPE_ICONS: Record<string, string> = {
  'Memorization': 'i-lucide-book-open',
  'Tajweed': 'i-lucide-mic',
  'Aqeedah': 'i-lucide-book-text',
}

const TYPE_LABELS: Record<string, string> = {
  'Memorization': 'حفظ',
  'Tajweed': 'تجويد',
  'Aqeedah': 'عقيدة',
}

// Each halaqa gets a distinct color by index, regardless of type
const PALETTE = [
  { bg: '#f3e8f2', text: '#804c7d' },
  { bg: '#E0F0EE', text: '#356668' },
  { bg: '#FFF3E0', text: '#C76400' },
  { bg: '#FCE4EC', text: '#B5174E' },
  { bg: '#E3F2FD', text: '#2196F3' },
  { bg: '#F3EDE4', text: '#695d45' },
]

function getColor(index: number) {
  return PALETTE[index % PALETTE.length]
}

function getIcon(type: string) {
  return TYPE_ICONS[type] || 'i-lucide-circle'
}

function getLabel(type: string) {
  return TYPE_LABELS[type] || type
}

function isSelected(halaqa: ApiHalaqa) {
  return selectedHalaqa.value?.id === halaqa.id
}
</script>

<template>
  <UModal
    v-model:open="isModalOpen"
    :ui="{
      content: 'sm:max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl p-0',
      overlay: 'backdrop-blur-md'
    }"
    @close="closeModal"
  >
    <template #content>
      <div class="flex flex-col">
        <!-- Modal Header -->
        <div class="px-8 pt-10 pb-6 text-center">
          <h2 class="text-2xl font-bold mb-2" style="color: var(--color-on-surface);">
            اختر الحلقة للمتابعة
          </h2>
          <p class="body-md" style="color: var(--color-on-surface-variant);">
            تبديل بين حلقات الدراسة والمجموعات النشطة
          </p>
        </div>

        <!-- Halaqa Grid -->
        <div class="px-8 py-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <!-- Halaqa Cards -->
            <UButton
              v-for="(halaqa, i) in halaqat"
              :key="halaqa.id"
              variant="ghost"
              color="neutral"
              class="relative rounded-2xl p-6 flex flex-col items-center text-center"
              :class="isSelected(halaqa) ? 'border-2 shadow-lg' : 'border border-gray-200 hover:shadow-lg'"
              :style="isSelected(halaqa)
                ? `background-color: ${getColor(i).bg}; border-color: ${getColor(i).text};`
                : 'background-color: white;'"
              @click="selectHalaqa(halaqa)"
            >
              <!-- Selected indicator -->
              <div
                v-if="isSelected(halaqa)"
                class="absolute top-3 end-3"
                :style="`color: ${getColor(i).text};`"
              >
                <UIcon name="i-lucide-check-circle" class="w-5 h-5" style="fill: currentColor;" />
              </div>

              <!-- Icon -->
              <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                :style="isSelected(halaqa)
                  ? 'background-color: white;'
                  : `background-color: ${getColor(i).bg};`"
              >
                <UIcon
                  :name="getIcon(halaqa.type)"
                  class="w-8 h-8"
                  :style="`color: ${getColor(i).text};`"
                />
              </div>

              <!-- Name -->
              <h3
                class="text-lg font-bold mb-1"
                :style="isSelected(halaqa) ? `color: ${getColor(i).text};` : 'color: var(--color-on-surface);'"
              >
                {{ halaqa.name }}
              </h3>

              <!-- Type label -->
              <span class="text-xs font-bold" style="color: var(--color-on-surface-variant);">
                {{ getLabel(halaqa.type) }}
              </span>
            </UButton>

            <!-- Create New Placeholder (Optional - can be removed if not needed) -->
            <UButton
              variant="ghost"
              color="neutral"
              class="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-white"
              style="background-color: #f9f9f9;"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-white"
                style="color: var(--color-on-surface-variant);"
              >
                <UIcon name="i-lucide-plus" class="w-6 h-6" />
              </div>
              <h3 class="text-sm font-bold" style="color: var(--color-on-surface-variant);">
                إضافة جديد
              </h3>
            </UButton>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="mt-auto px-8 py-8 flex items-center justify-between"
          style="border-top: 1px solid var(--color-outline-variant);"
        >
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            label="إلغاء"
            class="px-4 py-2 rounded-xl gap-2 font-normal"
            style="color: var(--color-on-surface-variant);"
            :ui="{ leadingIcon: 'w-5 h-5' }"
            @click="closeModal"
          />

          <UButton
            variant="solid"
            color="primary"
            label="تأكيد الاختيار"
            size="md"
            class="text-sm px-6 py-2.5 rounded-full hover:opacity-90"
            @click="closeModal"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
