import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const configurado = Boolean(url && clave)

// La clave publicable puede ir en el navegador: lo que cada usuario puede
// leer o modificar lo deciden las políticas RLS de la base de datos.
export const supabase = configurado ? createClient(url, clave) : null

// Traduce los errores de Supabase a mensajes para el usuario. Los errores
// de las reglas de negocio ya vienen en español desde los triggers.
export function mensajeError(error) {
  if (!error) return ''
  const texto = error.message ?? String(error)
  if (/row-level security|permission denied/i.test(texto)) return 'No tenés permiso para hacer esto.'
  if (error.code === '23505') return 'Ya existe un registro con ese código.'
  if (error.code === '23514' && /check constraint/i.test(texto)) {
    return 'Revisá los datos: hay un valor fuera de lo permitido.'
  }
  if (texto === 'Invalid login credentials') return 'Email o contraseña incorrectos.'
  if (/failed to fetch|network/i.test(texto)) return 'No se pudo conectar con el servidor. Probá de nuevo.'
  return texto
}
