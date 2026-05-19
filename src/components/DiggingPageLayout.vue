<template>
  <div class="digging-page w-full max-w-6xl mx-auto">
    <div class="card ">
      <div class="card-body p-3 sm:p-4 md:p-5 gap-0">
        <header class="digging-toolbar shrink-0">
          <slot name="toolbar" />
        </header>

        <div
          class="digging-workspace mt-3 justify-center flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5 xl:gap-6"
        >
          <section
            class="digging-grid-col w-full max-w-[min(100%,min(92vw,520px))] mx-auto shrink-0 lg:mx-0 lg:w-[min(100%,520px)]"
            :class="$slots.patterns ? '' : 'lg:max-w-[min(100%,560px)] lg:mx-auto'"
          >
            <slot name="grid" />
          </section>

          <aside
            v-if="$slots.patterns"
            class="digging-patterns-col w-full min-w-0 lg:flex-1 lg:self-center lg:max-w-[250px] max-w-[500px] mx-auto lg:mx-0"
          >
            <slot name="patterns" />
          </aside>
        </div>
      </div>
    </div>

    <slot />
  </div>
</template>
