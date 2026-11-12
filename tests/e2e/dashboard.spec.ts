import { test, expect } from '@playwright/test'
import { mockBackend } from './mock-backend'

test.beforeEach(async ({ page }) => { await mockBackend(page); await page.goto('/') })

test('initial summary, deduplication, totals and responsive layout', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByTestId('enrolled')).toHaveText('12.840')
  await expect(page.getByTestId('assigned')).toHaveText('11.520')
  await expect(page.getByTestId('pending')).toHaveText('3.180')
  await expect(page.getByTestId('delivered')).toHaveText('8.340')
  await expect(page.getByText('Vista de demostración', { exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Sur' })).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const map = await page.locator('.map-card').boundingBox()
  const chart = await page.locator('.sector-chart-card').boundingBox()
  if (testInfo.project.name === 'desktop') expect(chart!.x).toBeGreaterThan(map!.x + map!.width)
  else expect(chart!.y).toBeGreaterThan(map!.y + map!.height)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-summary.png`, fullPage: true })
})

test('sector filter synchronizes metrics, chart, weekly series and table', async ({ page }) => {
  const before = await page.locator('.weekly-chart').getAttribute('aria-label')
  await page.getByRole('combobox', { name: 'Sector', exact: true }).click()
  await page.getByRole('option', { name: 'Sur', exact: true }).click()
  await expect(page.getByTestId('enrolled')).toHaveText('2.640')
  await expect(page.getByTestId('assigned')).toHaveText('2.380')
  await expect(page.getByTestId('pending')).toHaveText('790')
  await expect(page.getByTestId('delivered')).toHaveText('1.590')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.getByTestId('map-detail')).toContainText('Sector Sur')
  await expect(page.locator('.sector-chart')).toHaveAttribute('aria-label', /Sur: 1590 entregados y 790 pendientes/)
  await expect(page.locator('.weekly-chart')).not.toHaveAttribute('aria-label', before!)
  await expect(page).toHaveURL(/sector=sur/)
  await page.getByRole('button', { name: 'Limpiar sector' }).click()
  await expect(page.locator('tbody tr')).toHaveCount(6)
  await expect(page.getByTestId('pending')).toHaveText('3.180')
})

test('map selection applies to the entire dashboard and can be cleared', async ({ page }) => {
  await page.getByRole('button', { name: 'Seleccionar sector Centro, 400 pendientes' }).click()
  await expect(page.getByTestId('pending')).toHaveText('400')
  await expect(page.getByRole('combobox', { name: 'Sector', exact: true })).toContainText('Centro')
  await expect(page.getByTestId('map-detail')).toContainText('2.300')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Quitar filtro de sector' }).click()
  await expect(page.getByTestId('map-detail')).toHaveCount(0)
  await expect(page.getByTestId('enrolled')).toHaveText('12.840')
})

test('campaign updates all sections and survives refresh', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Campaña', exact: true }).click()
  await page.getByRole('option', { name: 'Navidad 2025' }).click()
  await expect(page.getByTestId('enrolled')).not.toHaveText('12.840')
  await expect(page.getByTestId('pending')).toHaveText('2.575')
  await expect(page).toHaveURL(/campana=2025/)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Campaña', exact: true })).toContainText('2025')
  await expect(page.getByTestId('pending')).toHaveText('2.575')
})

test('pending sort reverses table order and export downloads the selected data', async ({ page }) => {
  await expect(page.locator('tbody tr').first()).toContainText('Sur')
  await page.getByRole('button', { name: 'Ordenar pendientes de menor a mayor' }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Norte')
  await expect(page.getByRole('columnheader').filter({ hasText: 'Pendientes' })).toHaveAttribute('aria-sort', 'ascending')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar Excel' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('resumen-navidad-2026-todos-demo.xlsx')
})

test('map is keyboard accessible and mobile filters remain visible after scrolling', async ({ page }, testInfo) => {
  const sector = page.getByRole('button', { name: 'Seleccionar sector Norte, 380 pendientes' })
  await sector.focus()
  await sector.press('Enter')
  await expect(page.getByTestId('pending')).toHaveText('380')
  if (testInfo.project.name === 'mobile') {
    await page.locator('.table-card').scrollIntoViewIfNeeded()
    await expect(page.getByRole('combobox', { name: 'Sector', exact: true })).toBeInViewport()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await expect(page.getByRole('navigation')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar menú' }).click()
    await expect(page.locator('.sidebar')).not.toHaveClass(/is-open/)
  }
})
