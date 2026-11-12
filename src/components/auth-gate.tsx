import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Gift, LockKeyhole, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { configurationError, supabase } from '@/lib/supabase'
import { useSystem } from '@/lib/system-context'
import { loginErrorMessage } from '@/lib/auth-errors'

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, error, refresh, reports } = useSystem()
  const [busy, setBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) })
      if (error) setLoginError(loginErrorMessage(error))
    } catch { setLoginError('No se pudo conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  async function loginWithGoogle() {
    if (!supabase || busy) return
    setBusy(true); setLoginError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } })
      if (error) setLoginError(loginErrorMessage(error))
    } catch { setLoginError('No se pudo abrir el acceso con Google. Inténtalo nuevamente.') }
    finally { setBusy(false) }
  }
  if (configurationError) return <div className="auth-screen"><Card className="auth-card"><h1>Revisa la configuración</h1><p>{configurationError}</p></Card></div>
  if (!supabase) return children
  if (loading && !session) return <div className="auth-screen" role="status">Verificando sesión…</div>
  if (!session) return <div className="auth-screen"><Card className="auth-card"><span className="auth-icon"><Gift size={27} /></span><span className="eyebrow">MUNICIPALIDAD DE LA FLORIDA</span><h1>Navidad en La Florida</h1><p>Ingresa con tu cuenta del equipo municipal.</p><div className="mt-6"><Button type="button" variant="outline" className="w-full" onClick={loginWithGoogle} disabled={busy}>Continuar con Google</Button><p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">Usa Google si creaste tu cuenta con ese proveedor, o ingresa con tu correo y una contraseña ya configurada.</p></div><form onSubmit={login} className="operation-form"><label>Correo electrónico<Input name="email" type="email" required autoComplete="username" placeholder="nombre@ejemplo.cl" /></label><label>Contraseña<Input name="password" type="password" required autoComplete="current-password" /></label>{(loginError || error) && <p className="form-error" role="alert">{loginError || error}</p>}<Button type="submit" disabled={busy}><LockKeyhole />{busy ? 'Ingresando…' : 'Iniciar sesión'}</Button></form><p className="auth-note">Si aún no tienes acceso, solicita una invitación al administrador municipal.</p></Card></div>
  if (error) return <div className="auth-screen"><Card className="auth-card"><h1>No se pudieron cargar los datos</h1><p role="alert">{error}</p><div className="mt-5 flex gap-2"><Button onClick={() => void refresh()} disabled={loading}>{loading ? 'Cargando…' : 'Reintentar'}</Button><Button variant="outline" onClick={() => void supabase!.auth.signOut()}><LogOut />Cerrar sesión</Button></div></Card></div>
  if (loading || !reports) return <div className="auth-screen" role="status">Cargando datos de la campaña…</div>
  return children
}
