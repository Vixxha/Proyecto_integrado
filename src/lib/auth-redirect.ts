import type { SupabaseClient } from '@supabase/supabase-js'
import { loginErrorMessage } from './auth-errors'

const completions = new WeakMap<SupabaseClient, Promise<string | null>>()
const authParameters = ['code', 'sb_flow_id', 'error', 'error_code', 'error_description']

// One exchange per client, including React StrictMode remounts. Never log callback URLs.
export function completeAuthRedirect(client: SupabaseClient): Promise<string | null> {
  const existing = completions.get(client)
  if (existing) return existing
  const completion = finish(client)
  completions.set(client, completion)
  return completion
}

async function finish(client: SupabaseClient): Promise<string | null> {
  const url = new URL(window.location.href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  const isCallback = url.searchParams.has('code') || authParameters.slice(2).some(key => url.searchParams.has(key) || fragment.has(key)) || fragment.has('access_token')
  try {
    const { error: initializationError } = await client.auth.initialize()
    if (initializationError) return loginErrorMessage(initializationError)
    const errorCode = url.searchParams.get('error_code') || fragment.get('error_code')
    if (errorCode || url.searchParams.has('error') || fragment.has('error') || url.searchParams.has('error_description') || fragment.has('error_description')) {
      return loginErrorMessage({ code: errorCode || 'oauth_callback_error', status: 400 })
    }
    const code = url.searchParams.get('code')
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code, { flowId: url.searchParams.get('sb_flow_id') || undefined })
      return error ? loginErrorMessage(error) : null
    }
    // Support callbacks already issued by the previous implicit-flow version.
    if (fragment.has('access_token')) {
      const access_token = fragment.get('access_token')
      const refresh_token = fragment.get('refresh_token')
      if (!access_token || !refresh_token) return loginErrorMessage({ code: 'oauth_callback_error', status: 400 })
      const { error } = await client.auth.setSession({ access_token, refresh_token })
      return error ? loginErrorMessage(error) : null
    }
    return null
  } catch {
    return loginErrorMessage({ code: 'oauth_callback_error', status: 400 })
  } finally {
    if (isCallback) {
      authParameters.forEach(key => url.searchParams.delete(key))
      if (fragment.has('access_token') || authParameters.slice(2).some(key => fragment.has(key))) url.hash = ''
      window.history.replaceState(window.history.state, '', url)
    }
  }
}
