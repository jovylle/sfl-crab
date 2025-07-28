// composables/useTodayTreasureNames.js
import { computed } from "vue";
import { DIGGING_FORMATIONS } from '../../src_other/features/game/types/desert'
import { useLandData } from "@/composables/useLandData";

export function useTodayTreasureNames () {
  const { landData } = useLandData();

  return computed(() => {
    const keys = landData.value?.visitedFarmState?.desert?.digging?.patterns || [];
    const set = new Set();

    console.log("useTodayTreasureNames → pattern keys:", keys);

    for (const key of keys) {
      const formation = DIGGING_FORMATIONS[key];
      if (!formation) {
        console.warn("❌ Pattern key not found:", key);
        continue;
      }

      console.log(`🧩 Formation for ${key}:`, formation);

      formation.forEach(({ name }) => {
        if (name) {
          set.add(name);
        }
      });
    }
    

    const treasures = Array.from(set);
    console.log("Today’s treasure names (final):", treasures);
    return treasures;
  });
  
}
