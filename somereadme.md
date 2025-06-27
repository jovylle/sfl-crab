

## Creating a ZIP of Core Project Files

You can bundle just your Vite config, the `src/` folder, and `package.json` into a ZIP using the commands below.

### macOS / Linux

```bash
zip -r project-core-$(date +%F).zip vite.config.js src package.json api_response.json readme.md
```

* `-r` recursively includes the `src/` directory
* `project-core.zip` is the output file

---

### Windows PowerShell

```powershell
# generate a date string in YYYY-MM-DD format
$date = Get-Date -Format yyyy-MM-dd
# compress files into "project-core-YYYY-MM-DD.zip"
Compress-Archive -Path vite.config.js, src, package.json api_response.json readme.md -DestinationPath "project-core-$date.zip"
```

* `-Path` takes a comma-separated list of files/folders
* `-DestinationPath` specifies the ZIP file name

---

## Listing Project Structure (Excluding Folders)

Use `tree` to view your project layout while **excluding** folders like `node_modules`, `public`, or any other:

```bash
tree -I 'node_modules|public|another-folder'
```

* `-I` ignores matching folders using a pattern
* Replace `another-folder` with any directory you want to exclude
