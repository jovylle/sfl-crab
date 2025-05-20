
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
