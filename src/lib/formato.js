export const ESTADOS_ORDEN = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  cerrada: 'Cerrada',
}

export const PRIORIDADES = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

export const TIPOS_ORDEN = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
}

export const ESTADOS_EQUIPO = {
  operativo: 'Operativo',
  en_mantenimiento: 'En mantenimiento',
  fuera_de_servicio: 'Fuera de servicio',
}

export const CRITICIDADES = {
  A: 'A · Crítico para la producción',
  B: 'B · Importante',
  C: 'C · Secundario',
}

const UNIDADES = { unidad: 'u.', litro: 'L', kg: 'kg', metro: 'm' }
export const abreviarUnidad = (unidad) => UNIDADES[unidad] ?? unidad

export const codigoOrden = (id) => `OT-${String(id).padStart(5, '0')}`

const formatoFecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const formatoNumero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

// Las columnas "date" llegan como "2026-10-20": se arma la fecha local para
// que no corra un día por la zona horaria.
export function fecha(valor) {
  if (!valor) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor)
  return formatoFecha.format(d)
}

export const fechaHora = (valor) => (valor ? formatoFechaHora.format(new Date(valor)) : '—')

export const numero = (valor) => (valor == null ? '—' : formatoNumero.format(valor))

export function haceCuanto(valor) {
  const minutos = Math.round((Date.now() - new Date(valor).getTime()) / 60000)
  if (minutos < 60) return `hace ${Math.max(minutos, 1)} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

// Exporta filas a un CSV que Excel abre bien (separador ";" y BOM UTF-8).
export function descargarCsv(nombreArchivo, columnas, filas) {
  const celda = (v) => {
    const texto = v == null ? '' : String(v)
    return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
  }
  const lineas = [
    columnas.map((c) => celda(c.titulo)).join(';'),
    ...filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';')),
  ]
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}
