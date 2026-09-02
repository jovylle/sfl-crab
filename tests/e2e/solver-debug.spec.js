import { test, expect } from '@playwright/test'

// The /solver-debug page evaluates every baked solver scenario in the real
// app bundle and renders a PASS/FAIL badge per scenario card — including the
// G8 completed-pre-commit regression. Backend-free: no /api calls involved.
test('solver-debug scenarios all pass, incl. G8 completed pre-commit', async ({ page }) => {
  await page.goto('/solver-debug')
  await expect(page.getByText('PASS', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.badge-error')).toHaveCount(0)
  await expect(page.getByText('I8 (idx 78) guaranteed Camel Bone')).toBeVisible()
  await expect(page.getByText('H9 (idx 87) slug = camel_bone')).toBeVisible()
})
