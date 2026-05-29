// composables/useTodayTreasureNames.js
import { computed } from "vue";
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { useLandData } from "@/composables/useLandData";

export function useTodayTreasureNames () {
  const { landData, dailyPatternKeys } = useLandData();

  return computed(() => {
    const landKeys = landData.value?.visitedFarmState?.desert?.digging?.patterns || [];
    const keys = landKeys.length ? landKeys : dailyPatternKeys.value;
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
