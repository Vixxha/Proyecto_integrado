import { expect, test } from '@playwright/test'

test('login offers Google and sends the correct OAuth parameters', async ({ page }) => {
  let authorizationUrl = ''
  await page.route('**/auth/v1/authorize?*', route => { authorizationUrl = route.request().url(); return route.fulfill({ status: 200, contentType: 'text/plain', body: 'OAuth request received' }) })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar con Google' }).click()
  await expect(page).toHaveURL(/\/auth\/v1\/authorize\?/)
  expect(new URL(authorizationUrl).searchParams.get('provider')).toBe('google')
  expect(new URL(authorizationUrl).searchParams.get('redirect_to')).toBe('http://127.0.0.1:5173')
})

test('OAuth accounts receive an actionable password login error', async ({ page }) => {
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', message: 'Invalid login credentials' }) }))
  await page.goto('/')
  await page.getByLabel('Correo electrónico').fill('cuenta-de-prueba@example.invalid')
  await page.getByLabel('Contraseña', { exact: true }).fill('ClaveFicticiaDePrueba')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Continuar con Google')
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeEnabled()
})
