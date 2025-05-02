# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).


## Syncing Upstream Sunflower-Land Types

To pull in the latest `desert.ts` (and its companions) from the official Sunflower-Land repo into your Vue project:

1. **Add the upstream remote (if you haven’t already):**
   ```bash
   git remote add sunflower https://github.com/sunflower-land/sunflower-land.git


Import the types folder via Git subtree:

bash
Copy
Edit
git subtree add \
  --prefix src/features/game/types \
  sunflower main \
  --squash \
  --message "Import Sunflower-Land game types"


To pull in future updates:

bash
Copy
Edit
git subtree pull \
  --prefix src/features/game/types \
  sunflower main \
  --squash
bash
Copy
Edit
