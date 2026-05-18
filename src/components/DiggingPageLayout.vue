<template>
  <div class="digging-page w-full max-w-6xl mx-auto">
    <div class="card bg-base-100 shadow-sm border border-base-300/40">
      <div class="card-body p-3 sm:p-4 md:p-5 gap-0">
        <header class="digging-toolbar shrink-0">
          <slot name="toolbar" />
        </header>

        <div
          class="digging-workspace mt-3 grid grid-cols-1 gap-4 lg:gap-5 xl:gap-6 items-start"
          :class="hasPatterns ? 'lg:grid-cols-[minmax(0,1fr)_minmax(220px,340px)]' : ''"
        >
          <section
            class="digging-grid-col w-full max-w-[min(100%,min(92vw,520px))] lg:max-w-none mx-auto lg:mx-0"
            :class="hasPatterns ? '' : 'lg:max-w-[min(100%,560px)] lg:mx-auto'"
          >
            <slot name="grid" />
          </section>

          <aside v-if="hasPatterns" class="digging-patterns-col w-full min-w-0">
            <slot name="patterns" />
          </aside>
        </div>
      </div>
    </div>

    <slot />
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const slots = useSlots()
const hasPatterns = computed(() => Boolean(slots.patterns?.()))
</script>
