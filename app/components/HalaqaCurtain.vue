<script setup lang="ts">
const { selectedHalaqa } = useGlobalHalaqa()

const visible = ref(false)
const phase = ref<'idle' | 'entering' | 'covered' | 'leaving'>('idle')
const displayHalaqa = ref(selectedHalaqa.value)

const TYPE_LABELS: Record<string, string> = {
  Memorization: 'حفظ',
  Tajweed: 'تجويد',
  Aqeedah: 'عقيدة',
}

const TYPE_ICONS: Record<string, string> = {
  Memorization: 'i-lucide-book-open',
  Tajweed: 'i-lucide-mic',
  Aqeedah: 'i-lucide-book-text',
}

const curtainStyle = computed(() => {
  if (phase.value === 'idle') {
    return { transform: 'scaleX(0)', transformOrigin: 'right center' }
  }
  if (phase.value === 'entering') {
    return {
      transform: 'scaleX(1)',
      transformOrigin: 'right center',
      transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
    }
  }
  if (phase.value === 'covered') {
    return { transform: 'scaleX(1)' }
  }
  if (phase.value === 'leaving') {
    return {
      transform: 'scaleX(0)',
      transformOrigin: 'left center',
      transition: 'transform 900ms cubic-bezier(0.64, 0, 0.78, 0)',
    }
  }
  return {}
})

watch(selectedHalaqa, async (next, prev) => {
  if (!prev || !next || next.id === prev.id) return

  visible.value = true
  phase.value = 'idle'

  await nextTick()
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  phase.value = 'entering'
  await new Promise(r => setTimeout(r, 950))

  phase.value = 'covered'
  displayHalaqa.value = next
  await new Promise(r => setTimeout(r, 1000))

  phase.value = 'leaving'
  await new Promise(r => setTimeout(r, 950))

  visible.value = false
  phase.value = 'idle'
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0"
      style="z-index: 9999; pointer-events: none;"
      :style="curtainStyle"
    >
      <!-- Background with centered glow -->
      <div
        class="absolute inset-0"
        style="
          background: #5a3358;
          background-image: radial-gradient(ellipse 55% 45% at 50% 50%, rgba(192,140,189,0.35) 0%, transparent 65%);
        "
      />

      <!-- Content — only shown when fully covered -->
      <Transition name="content-rise">
        <div
          v-if="phase === 'covered' && displayHalaqa"
          class="absolute inset-0 flex flex-col items-center justify-center gap-7"
          style="z-index: 1; direction: rtl;"
        >
          <!-- Icon -->
          <div
            class="w-20 h-20 rounded-3xl flex items-center justify-center"
            style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);"
          >
            <UIcon
              :name="TYPE_ICONS[displayHalaqa.type] || 'i-lucide-book-open'"
              class="w-10 h-10"
              style="color: white;"
            />
          </div>

          <!-- Halaqa name -->
          <h2
            class="font-bold text-center"
            style="color: white; font-size: 52px; line-height: 1.2;"
          >
            {{ displayHalaqa.name }}
          </h2>

          <!-- Divider + type label -->
          <div class="flex items-center gap-4" style="width: 260px;">
            <div class="flex-1 h-px" style="background: rgba(255,255,255,0.2);" />
            <span
              class="font-medium shrink-0"
              style="color: rgba(255,255,255,0.5); font-size: 13px; letter-spacing: 0.1em;"
            >{{ TYPE_LABELS[displayHalaqa.type] }}</span>
            <div class="flex-1 h-px" style="background: rgba(255,255,255,0.2);" />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.content-rise-enter-active {
  transition: all 500ms cubic-bezier(0.34, 1.4, 0.64, 1);
}
.content-rise-enter-from {
  opacity: 0;
  transform: translateY(28px);
}
.content-rise-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.content-rise-leave-active {
  transition: all 250ms ease-in;
}
.content-rise-leave-from {
  opacity: 1;
}
.content-rise-leave-to {
  opacity: 0;
}
</style>
