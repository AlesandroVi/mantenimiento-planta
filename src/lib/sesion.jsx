import { useEffect, useState } from 'react'
import { SesionContexto } from './useSesion'
import { supabase } from './supabase'

export function ProveedorSesion({ children }) {
  // undefined = todavía no se sabe si hay sesión; null = sin sesión.
  const [sesion, setSesion] = useState(supabase ? undefined : null)
  const [perfil, setPerfil] = useState(null)
  const usuarioId = sesion?.user?.id

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    let vigente = true
    supabase
      .from('perfiles')
      .select('id, nombre, puesto, rol')
      .eq('id', usuarioId)
      .single()
      .then(({ data }) => vigente && setPerfil(data))
    return () => {
      vigente = false
    }
  }, [usuarioId])

  // Si cambió el usuario, el perfil anterior ya no vale.
  const perfilActual = usuarioId && perfil?.id === usuarioId ? perfil : null

  const valor = {
    sesion,
    perfil: perfilActual,
    cargando: sesion === undefined || Boolean(sesion && !perfilActual),
    esSupervisor: perfilActual?.rol === 'supervisor',
    salir: () => supabase.auth.signOut(),
  }

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}
