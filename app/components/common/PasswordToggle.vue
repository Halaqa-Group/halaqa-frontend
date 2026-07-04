<script setup lang="ts">
const password = defineModel <string> ('password')
const show = ref(false)
</script>

<template>
  <UInput
    v-model="password"
    :type="show ? 'text' : 'password'"
    :ui="{ trailing: 'pe-1' }"
  >
    <template #trailing>
      <UButton
        v-if="password"
        color="neutral"
        variant="link"
        size="sm"
        :icon="show ? 'i-lucide:eye-slash' : 'i-lucide:eye'"
        :aria-label="show ? 'Hide password' : 'Show password'"
        :aria-pressed="show"
        aria-controls="password"
        @click="show = !show"
      />
    </template>
  </UInput>
</template>

<style>
::-ms-reveal {
  display: none;
}
</style>
