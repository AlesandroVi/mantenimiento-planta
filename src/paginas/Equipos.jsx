import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EstadoEquipo } from '../componentes/insignias'
import { Aviso, Boton, Buscador, Campo, Cargando, Encabezado, Modal, Selector, Tarjeta, Vacio } from '../componentes/ui'
import { CRITICIDADES, ESTADOS_EQUIPO, fecha } from '../lib/formato'
import { useSesion } from '../lib/useSesion'
import { mensajeError, supabase } from '../lib/supabase'
import { useConsulta } from '../lib/useConsulta'

export default function Equipos() {
  const { esSupervisor } = useSesion()
  const [busqueda, setBusqueda] = useState('')
  const [area, setArea] = useState('')
  const [estado, setEstado] = useState('')
  const [verBajas, setVerBajas] = useState(false)
  const [editando, setEditando] = useState(null) // null cerrado, {} nuevo, equipo existente

  const { datos, error, cargando, recargar } = useConsulta(
    () => ({
      equipos: supabase.from('equipos').select('*').order('codigo'),
      abiertas: supabase.from('ordenes_trabajo').select('equipo_id').neq('estado', 'cerrada'),
    }),
    [],
  )

  if (cargando && !datos) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>

  const ordenesAbiertas = datos.abiertas.reduce((cuenta, o) => {
    cuenta[o.equipo_id] = (cuenta[o.equipo_id] ?? 0) + 1
    return cuenta
  }, {})
  const areas = [...new Set(datos.equipos.map((e) => e.area))].sort()
  const texto = busqueda.trim().toLowerCase()
  const equipos = datos.equipos.filter(
    (e) =>
      (verBajas || e.activo) &&
      (!area || e.area === area) &&
      (!estado || e.estado === estado) &&
      (!texto || [e.codigo, e.nombre, e.tipo, e.fabricante, e.modelo].join(' ').toLowerCase().includes(texto)),
  )

  return (
    <>
      <Encabezado titulo="Equipos" descripcion="Activos de la planta, su criticidad y estado actual.">
        {esSupervisor && (
          <Boton variante="acento" onClick={() => setEditando({})}>
            Nuevo equipo
          </Boton>
        )}
      </Encabezado>

      <Tarjeta>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Buscador
            className="min-w-48 flex-1"
            placeholder="Buscar por código, nombre, tipo o marca"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar equipos"
          />
          <Selector value={area} onChange={(e) => setArea(e.target.value)} aria-label="Área">
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Selector>
          <Selector value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_EQUIPO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selector>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} className="size-4 accent-amber-500" />
            Ver dados de baja
          </label>
        </div>

        {equipos.length === 0 ? (
          <Vacio>No hay equipos que coincidan con el filtro.</Vacio>
        ) : (
          <div className="relative -mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="px-4 py-2 font-medium sm:px-5">Equipo</th>
                  <th className="px-2 py-2 font-medium">Área</th>
                  <th className="px-2 py-2 font-medium">Marca y modelo</th>
                  <th className="px-2 py-2 text-center font-medium">Criticidad</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Órdenes abiertas</th>
                  {esSupervisor && <th className="px-4 py-2 sm:px-5"><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {equipos.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${e.activo ? '' : 'opacity-60'}`}
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <span className="font-medium">{e.codigo}</span> · {e.nombre}
                      <span className="block text-xs text-slate-500">
                        {e.tipo}
                        {e.fecha_instalacion && ` · instalado ${fecha(e.fecha_instalacion)}`}
                        {!e.activo && ' · dado de baja'}
                      </span>
                    </td>
                    <td className="px-2 py-3">{e.area}</td>
                    <td className="px-2 py-3 text-slate-600 dark:text-slate-400">
                      {[e.fabricante, e.modelo].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-2 py-3 text-center font-semibold" title={CRITICIDADES[e.criticidad]}>
                      {e.criticidad}
                    </td>
                    <td className="px-2 py-3">
                      <EstadoEquipo estado={e.estado} />
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        to={`/ordenes?estado=todas&equipo=${e.id}`}
                        className="text-amber-700 hover:underline dark:text-amber-300"
                      >
                        {ordenesAbiertas[e.id] ?? 0} · historial
                      </Link>
                    </td>
                    {esSupervisor && (
                      <td className="px-4 py-3 text-right sm:px-5">
                        <Boton variante="secundario" className="px-2.5 py-1" onClick={() => setEditando(e)}>
                          Editar
                        </Boton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Criticidad: A = crítico para la producción, B = importante, C = secundario.
        </p>
      </Tarjeta>

      <FormularioEquipo
        equipo={editando}
        areas={areas}
        alCerrar={() => setEditando(null)}
        alGuardar={() => {
          setEditando(null)
          recargar()
        }}
      />
    </>
  )
}

function FormularioEquipo({ equipo, areas, alCerrar, alGuardar }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const esNuevo = equipo && !equipo.id

  async function guardar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const valores = {
      codigo: f.get('codigo').trim().toUpperCase(),
      nombre: f.get('nombre').trim(),
      area: f.get('area').trim(),
      tipo: f.get('tipo').trim(),
      fabricante: f.get('fabricante').trim() || null,
      modelo: f.get('modelo').trim() || null,
      criticidad: f.get('criticidad'),
      estado: f.get('estado'),
      fecha_instalacion: f.get('instalacion') || null,
      activo: f.get('activo') === 'on',
    }
    setEnviando(true)
    setError('')
    const consulta = esNuevo
      ? supabase.from('equipos').insert(valores)
      : supabase.from('equipos').update(valores).eq('id', equipo.id)
    const { error } = await consulta
    setEnviando(false)
    if (error) return setError(mensajeError(error))
    alGuardar()
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo equipo' : `Editar ${equipo?.codigo ?? ''}`} abierto={Boolean(equipo)} alCerrar={alCerrar}>
      {equipo && (
        <form className="grid gap-4" onSubmit={guardar}>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Campo
              etiqueta="Código"
              name="codigo"
              required
              pattern="[A-Za-z]{2,4}-[0-9]{2,4}"
              title="Letras, guion y números. Ej.: BC-103"
              placeholder="BC-103"
              defaultValue={equipo.codigo}
            />
            <Campo etiqueta="Nombre" name="nombre" required minLength={3} maxLength={80} defaultValue={equipo.nombre} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Área" name="area" required list="areas" defaultValue={equipo.area} />
            <datalist id="areas">
              {areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <Campo etiqueta="Tipo" name="tipo" required placeholder="Bomba, compresor…" defaultValue={equipo.tipo} />
            <Campo etiqueta="Fabricante" name="fabricante" defaultValue={equipo.fabricante ?? ''} />
            <Campo etiqueta="Modelo" name="modelo" defaultValue={equipo.modelo ?? ''} />
            <Campo etiqueta="Criticidad" como="select" name="criticidad" defaultValue={equipo.criticidad ?? 'B'}>
              {Object.entries(CRITICIDADES).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Campo>
            <Campo etiqueta="Estado" como="select" name="estado" defaultValue={equipo.estado ?? 'operativo'}>
              {Object.entries(ESTADOS_EQUIPO).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Campo>
            <Campo etiqueta="Fecha de instalación" type="date" name="instalacion" defaultValue={equipo.fecha_instalacion ?? ''} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="activo" defaultChecked={equipo.activo ?? true} className="size-4 accent-amber-500" />
            Equipo activo (desmarcar para darlo de baja sin perder su historial)
          </label>
          <Aviso>{error}</Aviso>
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={alCerrar}>
              Cancelar
            </Boton>
            <Boton type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar'}
            </Boton>
          </div>
        </form>
      )}
    </Modal>
  )
}
