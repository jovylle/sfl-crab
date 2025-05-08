# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).


## Syncing Upstream Sunflower-Land Types

To pull in the latest `desert.ts` (and its companions) from the official Sunflower-Land repo into your Vue project:

1. **Add the upstream remote (if you haven’t already):**
   ```bash
   git remote add sunflower https://github.com/sunflower-land/sunflower-land.git


## Creating a ZIP of Core Project Files

You can bundle just your Vite config, the `src/` folder, and `package.json` into a ZIP using the commands below.

### macOS / Linux

```bash
zip -r project-core-$(date +%F).zip vite.config.js src package.json api_response.json
````

* `-r` recursively includes the `src/` directory
* `project-core.zip` is the output file

---

### Windows PowerShell

```powershell
# generate a date string in YYYY-MM-DD format
$date = Get-Date -Format yyyy-MM-dd
# compress files into "project-core-YYYY-MM-DD.zip"
Compress-Archive -Path vite.config.js, src, package.json -DestinationPath "project-core-$date.zip"

```

* `-Path` takes a comma-separated list of files/folders
* `-DestinationPath` specifies the ZIP file name

```
