import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

export function AccountPassword() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get('password') || '')
    if (password !== String(data.get('confirmation') || '')) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true); setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.code === 'weak_password' ? 'La contraseña no cumple los requisitos del sistema. Usa una más larga y combina letras y números.' : error.code === 'same_password' ? 'Esa contraseña ya está configurada. Puedes utilizarla para ingresar.' : 'No se pudo guardar la contraseña. Vuelve a iniciar sesión e inténtalo nuevamente.'); return }
      form.reset()
      setSaved(true)
    } catch { setError('No se pudo conectar con el servicio. Inténtalo nuevamente.') }
    finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setError(''); setSaved(false) } }}><Button variant="ghost" size="icon" aria-label="Configurar contraseña" title="Configurar contraseña" onClick={() => setOpen(true)}><KeyRound /></Button><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}><DialogTitle className="text-lg font-semibold">Configurar contraseña</DialogTitle><DialogDescription className="mt-2 text-xs leading-relaxed text-muted-foreground">Después de entrar con Google, puedes crear una contraseña para usar también el acceso por correo electrónico.</DialogDescription>{saved ? <div className="mt-5"><p role="status" className="operation-message">Contraseña guardada. Ya puedes entrar con tu correo y contraseña o continuar usando Google.</p><Button onClick={() => setOpen(false)}>Listo</Button></div> : <form className="operation-form" onSubmit={submit}><label>Nueva contraseña<Input type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" disabled={busy} /></label><label>Repetir contraseña<Input type="password" name="confirmation" required minLength={8} maxLength={72} autoComplete="new-password" disabled={busy} /></label>{error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</Button></form>}</DialogContent></Dialog>
}
