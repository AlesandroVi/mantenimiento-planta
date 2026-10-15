import { useCallback, useEffect, useState } from 'react'
import { mensajeError } from './supabase'

// Ejecuta una o varias consultas de Supabase y expone datos, error y recarga.
// `consulta` devuelve una promesa con { data, error } o un objeto de ellas.
export function useConsulta(consulta, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: '', cargando: true })
  const [version, setVersion] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ejecutar = useCallback(consulta, dependencias)

  useEffect(() => {
    let vigente = true
    setEstado((previo) => ({ ...previo, cargando: true }))
    resolver(ejecutar()).then((resultado) => {
      if (vigente) setEstado({ ...resultado, cargando: false })
    })
    return () => {
      vigente = false
    }
  }, [ejecutar, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...estado, recargar }
}

async function resolver(promesas) {
  try {
    if (typeof promesas.then === 'function') {
      const { data, error } = await promesas
      return { datos: data, error: mensajeError(error) }
    }
    const claves = Object.keys(promesas)
    const respuestas = await Promise.all(claves.map((c) => promesas[c]))
    const conError = respuestas.find((r) => r.error)
    if (conError) return { datos: null, error: mensajeError(conError.error) }
    return { datos: Object.fromEntries(claves.map((c, i) => [c, respuestas[i].data])), error: '' }
  } catch (error) {
    return { datos: null, error: mensajeError(error) }
  }
}
