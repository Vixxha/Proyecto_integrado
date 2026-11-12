export function loginErrorMessage(error: { code?: string; status?: number; message?: string }) {
  if (['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'bad_jwt'].includes(error.code || '')) return 'Tu sesión venció o ya no es válida. Vuelve a ingresar con Google o con tu correo y contraseña.'
  if (error.code === 'access_denied') return 'Se canceló el acceso con Google. Puedes volver a intentarlo.'
  if (error.code === 'oauth_callback_error' || error.code === 'flow_state_not_found' || error.code === 'flow_state_expired' || error.code === 'bad_code_verifier' || /code verifier|code exchange|pkce/i.test(error.message || '')) return 'No se pudo completar el acceso con Google. Pulsa «Continuar con Google» nuevamente desde esta página y termina el proceso en el mismo navegador.'
  if (error.code === 'invalid_credentials' || (error.status === 400 && error.message === 'Invalid login credentials')) return 'No se pudo validar el correo y la contraseña. Si tu cuenta se creó con Google, usa «Continuar con Google».'
  if (error.code === 'email_not_confirmed') return 'Confirma tu correo electrónico antes de ingresar.'
  if (error.status === 429 || error.code === 'over_request_rate_limit') return 'Hubo demasiados intentos. Espera un momento antes de volver a ingresar.'
  if (error.code === 'provider_disabled' || error.code === 'validation_failed') return 'El método de acceso no está disponible. Contacta al administrador del sistema.'
  if (error.code === 'request_timeout' || !error.status || error.status >= 500) return 'No se pudo conectar con el servicio de acceso. Inténtalo nuevamente en unos momentos.'
  return 'No se pudo iniciar sesión. Inténtalo de nuevo o usa el método con el que creaste tu cuenta.'
}
