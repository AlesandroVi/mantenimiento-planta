import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoEquipo, EstadoOrden, Prioridad } from '../componentes/insignias'
import { Aviso, Boton, Campo, Cargando, Modal, Tarjeta, Vacio } from '../componentes/ui'
import { PRIORIDADES, TIPOS_ORDEN, abreviarUnidad, codigoOrden, fecha, fechaHora, numero } from '../lib/formato'
import { useSesion } from '../lib/useSesion'
import { mensajeError, supabase } from '../lib/supabase'
import { useConsulta } from '../lib/useConsulta'

export default function OrdenDetalle() {
  const { id } = useParams()
  const { perfil, esSupervisor } = useSesion()
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [retirando, setRetirando] = useState(false)

  const { datos, error: errorCarga, cargando, recargar } = useConsulta(
    () => ({
      orden: supabase
        .from('ordenes_trabajo')
        .select(
          '*, equipo:equipos(id, codigo, nombre, area, estado, criticidad), asignado:perfiles!ordenes_trabajo_asignado_a_fkey(id, nombre), creador:perfiles!ordenes_trabajo_creado_por_fkey(nombre)',
        )
        .eq('id', id)
        .maybeSingle(),
      movimientos: supabase
        .from('movimientos_stock')
        .select('id, cantidad, fecha, repuesto:repuestos(codigo, descripcion, unidad), usuario:perfiles(nombre)')
        .eq('orden_id', id)
        .order('fecha'),
      tecnicos: supabase.from('perfiles').select('id, nombre').eq('rol', 'tecnico').order('nombre'),
    }),
    [id],
  )

  if (cargando && !datos) return <Cargando />
  if (errorCarga) return <Aviso>{errorCarga}</Aviso>
  if (!datos.orden) return <Vacio>No existe la orden {id}.</Vacio>

  const { orden, movimientos, tecnicos } = datos
  const esAsignado = orden.asignado_a === perfil.id
  const puedeTrabajar = esSupervisor || esAsignado
  const abierta = orden.estado !== 'cerrada'

  // Aplica un cambio y verifica que la base lo haya aceptado: si RLS no deja
  // modificar la fila, Supabase no da error sino 0 filas actualizadas.
  async function actualizar(cambios, mensaje) {
    setGuardando(true)
    setError('')
    setAviso('')
    const { data, error } = await supabase.from('ordenes_trabajo').update(cambios).eq('id', id).select('id')
    setGuardando(false)
    if (error || !data.length) {
      setError(error ? mensajeError(error) : 'No tenés permiso para modificar esta orden.')
      return false
    }
    setAviso(mensaje)
    recargar()
    return true
  }

  return (
    <>
      <Link to="/ordenes" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        ← Órdenes de trabajo
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {codigoOrden(orden.id)} · {TIPOS_ORDEN[orden.tipo]}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{orden.titulo}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <EstadoOrden estado={orden.estado} />
            <Prioridad prioridad={orden.prioridad} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!esSupervisor && orden.estado === 'pendiente' && !orden.asignado_a && (
            <Boton disabled={guardando} onClick={() => actualizar({ asignado_a: perfil.id }, 'Tomaste la orden.')}>
              Tomar orden
            </Boton>
          )}
          {orden.estado === 'pendiente' && orden.asignado_a && puedeTrabajar && (
            <Boton disabled={guardando} onClick={() => actualizar({ estado: 'en_curso' }, 'Orden iniciada.')}>
              Iniciar trabajo
            </Boton>
          )}
          {orden.estado === 'en_curso' && puedeTrabajar && (
            <>
              <Boton variante="secundario" onClick={() => setRetirando(true)}>
                Retirar repuesto
              </Boton>
              <Boton variante="acento" onClick={() => setCerrando(true)}>
                Cerrar orden
              </Boton>
            </>
          )}
          {orden.estado === 'cerrada' && esSupervisor && (
            <Boton
              variante="secundario"
              disabled={guardando}
              onClick={() => actualizar({ estado: 'en_curso' }, 'Orden reabierta.')}
            >
              Reabrir
            </Boton>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-2">
        <Aviso>{error}</Aviso>
        <Aviso tono="ok">{aviso}</Aviso>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-6 lg:col-span-2">
          <Tarjeta titulo="Detalle">
            <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">
              {orden.descripcion || 'Sin descripción.'}
            </p>
            {orden.estado === 'cerrada' && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950/50">
                <p className="font-medium text-emerald-900 dark:text-emerald-200">
                  Cierre · {numero(orden.horas_trabajadas)} h trabajadas
                </p>
                <p className="mt-1 whitespace-pre-line text-emerald-900 dark:text-emerald-100">{orden.notas_cierre}</p>
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo="Repuestos utilizados">
            {movimientos.length === 0 ? (
              <Vacio>No se retiraron repuestos para esta orden.</Vacio>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {movimientos.map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <span>
                      <span className="font-medium">{m.repuesto.descripcion}</span>
                      <span className="block text-xs text-slate-500">
                        {m.repuesto.codigo} · {m.usuario?.nombre ?? 'Sistema'} · {fechaHora(m.fecha)}
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {m.cantidad} {abreviarUnidad(m.repuesto.unidad)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className="grid grid-cols-1 content-start gap-6">
          <Tarjeta titulo="Equipo">
            <p className="font-medium">
              {orden.equipo.codigo} · {orden.equipo.nombre}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {orden.equipo.area} · criticidad {orden.equipo.criticidad}
            </p>
            <div className="mt-2">
              <EstadoEquipo estado={orden.equipo.estado} />
            </div>
            <Link
              to={`/ordenes?estado=todas&equipo=${orden.equipo.id}`}
              className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline dark:text-amber-300"
            >
              Ver historial del equipo →
            </Link>
          </Tarjeta>

          <Tarjeta titulo="Seguimiento">
            {esSupervisor && abierta ? (
              <form
                className="mb-4 grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  actualizar(
                    {
                      asignado_a: f.get('asignado') || null,
                      prioridad: f.get('prioridad'),
                      fecha_programada: f.get('fecha') || null,
                    },
                    'Cambios guardados.',
                  )
                }}
              >
                <Campo etiqueta="Asignada a" como="select" name="asignado" defaultValue={orden.asignado_a ?? ''} key={`a${orden.asignado_a}`}>
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </Campo>
                <Campo etiqueta="Prioridad" como="select" name="prioridad" defaultValue={orden.prioridad} key={`p${orden.prioridad}`}>
                  {Object.entries(PRIORIDADES).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </Campo>
                <Campo
                  etiqueta="Fecha programada"
                  type="date"
                  name="fecha"
                  defaultValue={orden.fecha_programada ?? ''}
                  key={`f${orden.fecha_programada}`}
                />
                <Boton type="submit" variante="secundario" disabled={guardando}>
                  Guardar cambios
                </Boton>
              </form>
            ) : (
              <p className="mb-4 text-sm">
                Asignada a <strong>{orden.asignado?.nombre ?? 'nadie todavía'}</strong>
                {orden.fecha_programada && <> · programada para el {fecha(orden.fecha_programada)}</>}
              </p>
            )}

            <ol className="relative grid gap-4 border-l-2 border-slate-200 pl-4 text-sm dark:border-slate-700">
              <Hito titulo="Creada" fecha={orden.creado_en} detalle={`por ${orden.creador.nombre}`} />
              <Hito titulo="Iniciada" fecha={orden.iniciado_en} />
              <Hito titulo="Cerrada" fecha={orden.cerrado_en} />
            </ol>
          </Tarjeta>
        </div>
      </div>

      <CerrarOrden
        abierto={cerrando}
        alCerrar={() => setCerrando(false)}
        alGuardar={(cambios) =>
          actualizar({ ...cambios, estado: 'cerrada' }, 'Orden cerrada.').then((ok) => ok && setCerrando(false))
        }
        guardando={guardando}
        error={error}
      />
      <RetirarRepuesto
        abierto={retirando}
        ordenId={orden.id}
        alCerrar={() => setRetirando(false)}
        alGuardar={(texto) => {
          setRetirando(false)
          setAviso(texto)
          recargar()
        }}
      />
    </>
  )
}

function Hito({ titulo, fecha: valor, detalle }) {
  return (
    <li>
      <span
        className={`absolute -left-[7px] mt-1 size-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
          valor ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      />
      <span className={valor ? 'font-medium' : 'text-slate-400'}>{titulo}</span>
      <span className="block text-xs text-slate-500">
        {valor ? fechaHora(valor) : 'Todavía no'} {valor && detalle}
      </span>
    </li>
  )
}

function CerrarOrden({ abierto, alCerrar, alGuardar, guardando, error }) {
  return (
    <Modal titulo="Cerrar orden de trabajo" abierto={abierto} alCerrar={alCerrar}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          alGuardar({ notas_cierre: f.get('notas').trim(), horas_trabajadas: Number(f.get('horas')) })
        }}
      >
        <Campo
          etiqueta="Trabajo realizado"
          como="textarea"
          name="notas"
          rows={4}
          required
          placeholder="Qué se hizo, qué se cambió y en qué estado queda el equipo."
        />
        <Campo etiqueta="Horas trabajadas" type="number" name="horas" min="0" max="999" step="0.5" required />
        <Aviso>{error}</Aviso>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando}>
            Cerrar orden
          </Boton>
        </div>
      </form>
    </Modal>
  )
}

function RetirarRepuesto({ abierto, ordenId, alCerrar, alGuardar }) {
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { perfil } = useSesion()
  const { datos } = useConsulta(
    () =>
      supabase
        .from('repuestos')
        .select('id, codigo, descripcion, stock_actual, unidad')
        .eq('activo', true)
        .gt('stock_actual', 0)
        .order('descripcion'),
    [abierto],
  )

  async function guardar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    const { error } = await supabase.from('movimientos_stock').insert({
      repuesto_id: Number(f.get('repuesto')),
      orden_id: ordenId,
      tipo: 'egreso',
      cantidad: Number(f.get('cantidad')),
      motivo: 'Consumo en orden de trabajo',
      usuario_id: perfil.id,
    })
    setEnviando(false)
    if (error) return setError(mensajeError(error))
    alGuardar('Repuesto retirado del pañol.')
  }

  return (
    <Modal titulo="Retirar repuesto del pañol" abierto={abierto} alCerrar={alCerrar}>
      <form className="grid gap-4" onSubmit={guardar}>
        <Campo etiqueta="Repuesto" como="select" name="repuesto" required defaultValue="">
          <option value="" disabled>
            Elegí un repuesto
          </option>
          {datos?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.descripcion} ({r.codigo}) · hay {r.stock_actual}
            </option>
          ))}
        </Campo>
        <Campo etiqueta="Cantidad" type="number" name="cantidad" min="1" step="1" defaultValue="1" required />
        <Aviso>{error}</Aviso>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={enviando}>
            Registrar retiro
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
