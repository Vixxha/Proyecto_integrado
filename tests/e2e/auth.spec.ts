import { expect, test } from '@playwright/test'
import { mockBackend } from './mock-backend'

test('login offers Google and sends the correct OAuth parameters', async ({ page }) => {
  let authorizationUrl = ''
  await page.route('**/auth/v1/authorize?*', route => { authorizationUrl = route.request().url(); return route.fulfill({ status: 200, contentType: 'text/plain', body: 'OAuth request received' }) })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar con Google' }).click()
  await expect(page).toHaveURL(/\/auth\/v1\/authorize\?/)
  expect(new URL(authorizationUrl).searchParams.get('provider')).toBe('google')
  expect(new URL(authorizationUrl).searchParams.get('redirect_to')).toBe('http://127.0.0.1:5173')
  expect(new URL(authorizationUrl).searchParams.get('code_challenge_method')).toBe('s256')
  expect(new URL(authorizationUrl).searchParams.get('code_challenge')).toBeTruthy()
})

test('Google PKCE callback exchanges once, loads the dashboard and removes the code', async ({ page }) => {
  const { session } = await mockBackend(page, false)
  let exchanges = 0
  await page.addInitScript(() => localStorage.setItem('sb-ovnvoodmxuygkxgczeka-auth-token-code-verifier', JSON.stringify('fake-verifier')))
  await page.route('**/auth/v1/token?grant_type=pkce', route => {
    exchanges++
    expect(route.request().postDataJSON().auth_code).toBe('fake-oauth-code')
    expect(route.request().postDataJSON().code_verifier).toBe('fake-verifier')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) })
  })
  await page.goto('/?code=fake-oauth-code&campana=2025')
  await expect(page.getByTestId('enrolled')).toBeVisible()
  await expect(page).not.toHaveURL(/code=/)
  await expect(page).toHaveURL(/campana=2025/)
  expect(exchanges).toBe(1)
  await page.reload()
  await expect(page.getByTestId('enrolled')).toBeVisible()
  expect(exchanges).toBe(1)
})

test('failed Google callback shows a safe retry message and clears URL credentials', async ({ page }) => {
  await page.goto('/?error=access_denied&error_code=oauth_callback_error&error_description=PRIVATE_ERROR_DETAIL#access_token=FAKE-PRIVATE-TOKEN')
  await expect(page.getByRole('alert')).toContainText('No se pudo completar el acceso con Google')
  await expect(page).not.toHaveURL(/error|access_token|PRIVATE/)
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled()
  await expect(page.locator('body')).not.toContainText('PRIVATE_ERROR_DETAIL')
})

test('a callback without its verifier can be retried instead of silently losing the session', async ({ page }) => {
  await page.goto('/?code=fake-code-without-verifier')
  await expect(page.getByRole('alert')).toContainText('mismo navegador')
  await expect(page).not.toHaveURL(/code=/)
})

test('previous implicit callbacks restore the Supabase session and clear tokens', async ({ page }) => {
  const { session } = await mockBackend(page, false)
  await page.goto('/#' + new URLSearchParams({ access_token: session.access_token, refresh_token: session.refresh_token, token_type: 'bearer', expires_in: '3600' }))
  await expect(page.getByTestId('enrolled')).toBeVisible()
  await expect(page).not.toHaveURL(/access_token|refresh_token/)
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
