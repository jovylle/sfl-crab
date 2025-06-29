<!-- src/components/HintPicker.vue -->
<template>
  <div
    v-if="visible"
    class="dropdown dropdown-open w-[40%]"
    :style="popoverStyle"
    @click.stop
  >
    <button class="btn btn-ghost p-0 w-0 h-0" ref="anchor" />
    <div
      ref="dropdownContent"
      class="dropdown-content bg-base-100 border border-base-300 shadow-lg p-0.5 sm:p-1 md:p-2 w-full"
    >
      <ul class="!grid !grid-cols-3 !grid-rows-2">
        <li
          v-for="(hintClass, idx) in hints"
          :key="hintClass + idx"
          class="aspect-square flex items-center justify-center m-0.5 border border-base-300 tooltip"
          :data-tip="`press '${reverseKeyMap[hintClass] || ''}' to pick`"
          @click="selectHint(idx)"
        >
          <div
            v-if="hintClass === 'no-hint-and-show-trash-icon'"
            class="tooltip tooltip-warning flex justify-center items-center tile w-full h-full border border-base-300"
          >
            <span class="text-lg sm:text-3xl text-error">X</span>
          </div>
          <div
            v-else
            :class="[hintClass, 'tile w-full h-full border border-base-300']"
          />
        </li>
      </ul>
      <!-- Pattern suggestions1 -->
      <p
        v-if="props.possibleTreasures.length"
        class="text-[0.6rem] sm:text-xs text-base-content/70 px-2 pt-1"
      >
        Today's Treasure
      </p>
      <p v-else></p>
      <ul
        v-if="props.possibleTreasures.length"
        class="mt-1 p-0.5 sm:p-1 w-full bg-base-100 rounded-box flex flex-wrap gap-0.5 sm:gap-1 justify-center"
      >
        <li
          v-for="(hintClass, idx) in props.possibleTreasures"
          :key="'suggested-' + idx"
          class="w-[22.5%] aspect-square border border-base-300 rounded cursor-pointer hover:opacity-70"
          @click="selectSuggestedHint(hintClass)"
        >
          <div
            class="hint-treasure tile w-full h-full"
            :style="getTreasureStyle(hintClass)"
          ></div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue'

// 1️⃣ Define your props
const props = defineProps({
  hints:     { type: Array, required: true },   // e.g. ['hint-sand','hint-crab',…]
  x:         { type: Number, required: true },
  y:         { type: Number, required: true },
  possibleTreasures: { type: Array, default: () => [] },
  tileIndex: { type: Number, required: true }
})

// 2️⃣ Define the emit
const emit = defineEmits(['pick'])
const dropdownContent = ref(null)
const visible = ref(true)
const keyMap = {
  'q': 'hint-red-dot',
  'w': 'hint-potential-treasure',
  'e': 'hint-potential-treasure2',
  'a': 'hint-sand tileImage:sand',
  's': 'hint-treasure',
  'd': 'hint-crab tileImage:crab',
  'z': 'hint-nothing',
  'x': 'no-hint-and-show-trash-icon',
  'c': 'hint-crab-eyes-maybe'
}

watchEffect(async () => {
  if (visible.value) {
    await nextTick()
    const el = dropdownContent.value
    if (el) {
      const width = el.offsetWidth
      console.log("Setting transform with width:", width)
      el.style.transform = `translate(-50%, -${(width / 2) + 10}px)`
    } else {
      console.warn("dropdownContent not ready")
    }
  }
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

//  ___________ BELOW ARE THE FUNCTIONS ____________

const popoverStyle = computed(() => ({
  position:  'absolute',
  top:       `${props.y}px`,
  left:      `${props.x}px`,
  zIndex:    50
}))

const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, k]))

function selectHint(idx) {
  const chosenClass = props.hints[idx]
  emit('pick', { tileIndex: props.tileIndex, hint: chosenClass })
  visible.value = false
}

function handleKeydown(e) {
  const hint = keyMap[e.key.toLowerCase()]
  if (hint) {
    emit('pick', { tileIndex: props.tileIndex, hint })
    visible.value = false
  }
}

function selectSuggestedHint(hintClass) {
  console.log("selectSuggestedHint", hintClass);

  let rawName;

  if (hintClass.startsWith("hint-")) {
    const match = hintClass.match(/^hint-(.+)$/);
    if (!match) return;
    rawName = match[1].replace(/-/g, ' ');
  } else {
    rawName = hintClass;
  }

  const imageSlug = rawName.toLowerCase().replace(/\s+/g, "_");
  console.log("Picked manual pattern treasure:", [`hint-treasure`, `tileImage:${imageSlug}`]);

  emit('pick', {
    tileIndex: props.tileIndex,
    hint: `hint-treasure tileImage:${imageSlug}`
  });

  visible.value = false;
}


function getTreasureStyle(hintClass) {
  let name;

  if (hintClass.startsWith("hint-")) {
    const match = hintClass.match(/^hint-(.+)$/);
    if (!match) return {};
    name = match[1].replace(/-/g, ' ');
  } else {
    name = hintClass;
  }

  const slug = name.toLowerCase().replace(/\s+/g, "_");
  return {
    backgroundImage: `url(/world/${slug}.webp)`,
    backgroundSize: '70%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };
}
</script>
