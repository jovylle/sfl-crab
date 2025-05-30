<!-- src/components/Watermark.vue -->
<template>
  <div
    class="absolute left-1/2 -bottom-4 transform -translate-x-1/2 text-[0.45rem] sm:text-[0.5rem] lg:text-xs origin-center opacity-90 select-none pointer-events-none"
  >
    {{ displayUrl }}
  </div>
</template>

<script>
export default {
  name: 'Watermark',
  data() {
    return {
      appUrl: window.location.href,
    };
  },
  computed: {
    displayUrl() {
      try {
        return new URL(this.appUrl).origin.replace(/^https?:\/\//, '');
      } catch {
        return this.appUrl.replace(/^https?:\/\//, '');
      }
    },
  },
};
</script>

<style scoped>
/* All styling is via Tailwind/DaisyUI utilities */
</style>
