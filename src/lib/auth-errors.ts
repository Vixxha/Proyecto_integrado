export function loginErrorMessage(error: { code?: string; status?: number; message?: string }) {
  if (error.code === 'invalid_credentials' || (error.status === 400 && error.message === 'Invalid login credentials')) return 'No se pudo validar el correo y la contraseña. Si tu cuenta se creó con Google, usa «Continuar con Google».'
  if (error.code === 'email_not_confirmed') return 'Confirma tu correo electrónico antes de ingresar.'
  if (error.status === 429 || error.code === 'over_request_rate_limit') return 'Hubo demasiados intentos. Espera un momento antes de volver a ingresar.'
  if (error.code === 'provider_disabled' || error.code === 'validation_failed') return 'El método de acceso no está disponible. Contacta al administrador del sistema.'
  if (error.code === 'request_timeout' || !error.status || error.status >= 500) return 'No se pudo conectar con el servicio de acceso. Inténtalo nuevamente en unos momentos.'
  return 'No se pudo iniciar sesión. Inténtalo de nuevo o usa el método con el que creaste tu cuenta.'
}
