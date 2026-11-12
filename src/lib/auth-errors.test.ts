import { describe, expect, it } from 'vitest'
import { loginErrorMessage } from './auth-errors'

describe('login feedback', () => {
  it('guides OAuth accounts without assuming the user mistyped their password', () => {
    expect(loginErrorMessage({ code: 'invalid_credentials', status: 400 })).toContain('Continuar con Google')
    expect(loginErrorMessage({ message: 'Invalid login credentials', status: 400 })).toContain('Continuar con Google')
  })
  it('distinguishes service errors from invalid credentials', () => {
    expect(loginErrorMessage({ status: 503 })).toContain('servicio de acceso')
    expect(loginErrorMessage({ status: 429 })).toContain('demasiados intentos')
    expect(loginErrorMessage({ code: 'email_not_confirmed', status: 400 })).toContain('Confirma tu correo')
  })
})
