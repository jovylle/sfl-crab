<template>
  <div class="digging-page w-full max-w-6xl mx-auto">
    <div class="card bg-base-100 shadow-sm border border-base-300/40">
      <div class="card-body p-3 sm:p-4 md:p-5 gap-0">
        <header class="digging-toolbar shrink-0">
          <slot name="toolbar" />
        </header>

        <div
          class="digging-workspace mt-3 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5 xl:gap-6"
        >
          <section
            class="digging-grid-col w-full max-w-[min(100%,min(92vw,520px))] mx-auto shrink-0 lg:mx-0 lg:w-[min(100%,520px)]"
            :class="hasPatterns ? '' : 'lg:max-w-[min(100%,560px)] lg:mx-auto'"
          >
            <slot name="grid" />
          </section>

          <aside
            v-if="hasPatterns"
            class="digging-patterns-col w-full min-w-0 lg:flex-1 lg:self-stretch flex flex-col justify-center"
          >
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
