export function openMainDrawer () {
  const el = document.getElementById('main-drawer')
  if (el) el.checked = true
}

export function closeMainDrawer () {
  const el = document.getElementById('main-drawer')
  if (el) el.checked = false
}

export function toggleMainDrawer () {
  const el = document.getElementById('main-drawer')
  if (el) el.checked = !el.checked
}
