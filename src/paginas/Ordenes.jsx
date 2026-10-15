import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EstadoOrden, Prioridad } from '../componentes/insignias'
import { Aviso, Boton, Buscador, Campo, Cargando, Encabezado, Modal, Tarjeta, Vacio } from '../componentes/ui'
import { PRIORIDADES, TIPOS_ORDEN, codigoOrden, fecha, haceCuanto } from '../lib/formato'
import { useSesion } from '../lib/useSesion'
import { mensajeError, supabase } from '../lib/supabase'
import { useConsulta } from '../lib/useConsulta'

const filtrosEstado = [
  { valor: 'abiertas', texto: 'Abiertas' },
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'en_curso', texto: 'En curso' },
  { valor: 'cerrada', texto: 'Cerradas' },
  { valor: 'todas', texto: 'Todas' },
]

const ordenPrioridad = { critica: 0, alta: 1, media: 2, baja: 3 }

export default function Ordenes() {
  const { perfil, esSupervisor } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [soloMias, setSoloMias] = useState(false)
  const [creando, setCreando] = useState(false)

  const estado = parametros.get('estado') ?? 'abiertas'
  const equipoId = parametros.get('equipo')

  const { datos, error, cargando } = useConsulta(() => {
    let consulta = supabase
      .from('ordenes_trabajo')
      .select(
        'id, titulo, estado, prioridad, tipo, creado_en, fecha_programada, asignado_a, equipo:equipos(id, codigo, nombre, area), asignado:perfiles!ordenes_trabajo_asignado_a_fkey(nombre)',
      )
      .order('creado_en', { ascending: false })
    if (estado === 'abiertas') consulta = consulta.neq('estado', 'cerrada')
    else if (estado !== 'todas') consulta = consulta.eq('estado', estado)
    if (equipoId) consulta = consulta.eq('equipo_id', equipoId)
    return consulta
  }, [estado, equipoId])

  function cambiarFiltro(clave, valor) {
    const nuevos = new URLSearchParams(parametros)
    if (valor) nuevos.set(clave, valor)
    else nuevos.delete(clave)
    setParametros(nuevos, { replace: true })
  }

  const texto = busqueda.trim().toLowerCase()
  const ordenes = (datos ?? [])
    .filter((o) => !soloMias || o.asignado_a === perfil.id)
    .filter(
      (o) =>
        !texto ||
        [codigoOrden(o.id), o.titulo, o.equipo.codigo, o.equipo.nombre, o.equipo.area, o.asignado?.nombre]
          .join(' ')
          .toLowerCase()
          .includes(texto),
    )
    .sort((a, b) =>
      estado === 'cerrada' || estado === 'todas' ? 0 : ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad],
    )

  return (
    <>
      <Encabezado
        titulo="Órdenes de trabajo"
        descripcion="Mantenimiento preventivo y correctivo de los equipos de la planta."
      >
        <Boton variante="acento" onClick={() => setCreando(true)}>
          {esSupervisor ? 'Nueva orden' : 'Reportar falla'}
        </Boton>
      </Encabezado>

      <Tarjeta>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Estado">
            {filtrosEstado.map((f) => (
              <button
                key={f.valor}
                onClick={() => cambiarFiltro('estado', f.valor === 'abiertas' ? '' : f.valor)}
                aria-pressed={estado === f.valor}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  estado === f.valor
                    ? 'bg-white shadow-sm dark:bg-slate-950'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {f.texto}
              </button>
            ))}
          </div>
          <Buscador
            className="min-w-48 flex-1"
            placeholder="Buscar por código, título, equipo o técnico"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar órdenes"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloMias}
              onChange={(e) => setSoloMias(e.target.checked)}
              className="size-4 accent-amber-500"
            />
            Solo mis órdenes
          </label>
        </div>

        {equipoId && datos && (
          <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            Mostrando solo las órdenes del equipo {datos[0]?.equipo.codigo ?? 'seleccionado'}.
            <button className="font-medium text-amber-700 hover:underline dark:text-amber-300" onClick={() => cambiarFiltro('equipo', '')}>
              Ver todas
            </button>
          </p>
        )}

        {error && <Aviso>{error}</Aviso>}
        {cargando && !datos ? (
          <Cargando />
        ) : ordenes.length === 0 ? (
          <Vacio>No hay órdenes que coincidan con el filtro.</Vacio>
        ) : (
          <div className="relative -mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="px-4 py-2 font-medium sm:px-5">Orden</th>
                  <th className="px-2 py-2 font-medium">Equipo</th>
                  <th className="px-2 py-2 font-medium">Prioridad</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Asignada a</th>
                  <th className="px-4 py-2 text-right font-medium sm:px-5">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 sm:px-5">
                      <Link to={`/ordenes/${o.id}`} className="font-medium hover:text-amber-700 hover:underline dark:hover:text-amber-300">
                        {o.titulo}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        {codigoOrden(o.id)} · {TIPOS_ORDEN[o.tipo]}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="font-medium">{o.equipo.codigo}</span>
                      <span className="block text-xs text-slate-500">{o.equipo.area}</span>
                    </td>
                    <td className="px-2 py-3">
                      <Prioridad prioridad={o.prioridad} />
                    </td>
                    <td className="px-2 py-3">
                      <EstadoOrden estado={o.estado} />
                    </td>
                    <td className="px-2 py-3">{o.asignado?.nombre ?? <span className="text-slate-400">Sin asignar</span>}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 sm:px-5">
                      {o.fecha_programada && o.estado === 'pendiente' ? (
                        <>Programada {fecha(o.fecha_programada)}</>
                      ) : (
                        haceCuanto(o.creado_en)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <NuevaOrden abierto={creando} alCerrar={() => setCreando(false)} equipoInicial={equipoId} />
    </>
  )
}

export function NuevaOrden({ abierto, alCerrar, equipoInicial }) {
  const { esSupervisor } = useSesion()
  const navegar = useNavigate()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const { datos } = useConsulta(
    () => ({
      equipos: supabase.from('equipos').select('id, codigo, nombre').eq('activo', true).order('codigo'),
      perfiles: supabase.from('perfiles').select('id, nombre, rol').order('nombre'),
    }),
    [],
  )

  async function guardar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    const { data, error } = await supabase
      .from('ordenes_trabajo')
      .insert({
        equipo_id: Number(f.get('equipo')),
        titulo: f.get('titulo').trim(),
        descripcion: f.get('descripcion').trim() || null,
        tipo: f.get('tipo'),
        prioridad: f.get('prioridad'),
        asignado_a: f.get('asignado') || null,
        fecha_programada: f.get('fecha') || null,
      })
      .select('id')
      .single()
    setEnviando(false)
    if (error) return setError(mensajeError(error))
    alCerrar()
    navegar(`/ordenes/${data.id}`)
  }

  return (
    <Modal titulo={esSupervisor ? 'Nueva orden de trabajo' : 'Reportar una falla'} abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={guardar} className="grid gap-4">
        <Campo etiqueta="Equipo" como="select" name="equipo" required defaultValue={equipoInicial ?? ''}>
          <option value="" disabled>
            Elegí un equipo
          </option>
          {datos?.equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} · {e.nombre}
            </option>
          ))}
        </Campo>
        <Campo etiqueta="Título" name="titulo" required minLength={3} maxLength={120} placeholder="Ej.: Pérdida de aceite en el reductor" />
        <Campo etiqueta="Descripción" como="textarea" name="descripcion" rows={3} placeholder="Qué se observó, desde cuándo, mediciones…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Tipo" como="select" name="tipo" defaultValue={esSupervisor ? 'preventivo' : 'correctivo'}>
            {Object.entries(TIPOS_ORDEN).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Campo>
          <Campo etiqueta="Prioridad" como="select" name="prioridad" defaultValue="media">
            {Object.entries(PRIORIDADES).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Campo>
        </div>
        {esSupervisor && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Asignar a" como="select" name="asignado" defaultValue="">
              <option value="">Sin asignar</option>
              {datos?.perfiles
                .filter((p) => p.rol === 'tecnico')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </Campo>
            <Campo etiqueta="Fecha programada" type="date" name="fecha" />
          </div>
        )}
        {!esSupervisor && (
          <p className="text-xs text-slate-500">La orden queda pendiente hasta que un supervisor la asigne o la tomes vos.</p>
        )}
        <Aviso>{error}</Aviso>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Crear orden'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
