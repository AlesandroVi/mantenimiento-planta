import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { StockBajo } from '../componentes/insignias'
import { Aviso, Boton, Buscador, Campo, Cargando, Encabezado, Modal, Selector, Tarjeta, Vacio } from '../componentes/ui'
import { abreviarUnidad, codigoOrden, fechaHora } from '../lib/formato'
import { useSesion } from '../lib/useSesion'
import { mensajeError, supabase } from '../lib/supabase'
import { useConsulta } from '../lib/useConsulta'

export default function Repuestos() {
  const { esSupervisor } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [editando, setEditando] = useState(null)
  const [ingresando, setIngresando] = useState(null)
  const [historial, setHistorial] = useState(null)
  const soloBajo = parametros.get('bajo') === '1'

  const { datos, error, cargando, recargar } = useConsulta(
    () => supabase.from('repuestos').select('*').order('descripcion'),
    [],
  )

  if (cargando && !datos) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>

  const categorias = [...new Set(datos.map((r) => r.categoria))].sort()
  const texto = busqueda.trim().toLowerCase()
  const repuestos = datos.filter(
    (r) =>
      r.activo &&
      (!soloBajo || r.bajo_stock) &&
      (!categoria || r.categoria === categoria) &&
      (!texto || [r.codigo, r.descripcion, r.ubicacion].join(' ').toLowerCase().includes(texto)),
  )
  const cantidadBajo = datos.filter((r) => r.activo && r.bajo_stock).length

  return (
    <>
      <Encabezado titulo="Repuestos" descripcion="Stock del pañol de mantenimiento. Cada ingreso y retiro queda registrado.">
        {esSupervisor && (
          <Boton variante="acento" onClick={() => setEditando({})}>
            Nuevo repuesto
          </Boton>
        )}
      </Encabezado>

      {cantidadBajo > 0 && !soloBajo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <span className="flex items-center gap-2">
            <StockBajo />
            {cantidadBajo} {cantidadBajo === 1 ? 'repuesto está' : 'repuestos están'} en el stock mínimo o por debajo.
          </span>
          <button className="font-medium underline-offset-2 hover:underline" onClick={() => setParametros({ bajo: '1' })}>
            Ver cuáles
          </button>
        </div>
      )}

      <Tarjeta>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Buscador
            className="min-w-48 flex-1"
            placeholder="Buscar por código, descripción o ubicación"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar repuestos"
          />
          <Selector value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Selector>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloBajo}
              onChange={(e) => setParametros(e.target.checked ? { bajo: '1' } : {}, { replace: true })}
              className="size-4 accent-amber-500"
            />
            Solo stock bajo
          </label>
        </div>

        {repuestos.length === 0 ? (
          <Vacio>No hay repuestos que coincidan con el filtro.</Vacio>
        ) : (
          <div className="relative -mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="px-4 py-2 font-medium sm:px-5">Repuesto</th>
                  <th className="px-2 py-2 font-medium">Categoría</th>
                  <th className="px-2 py-2 font-medium">Ubicación</th>
                  <th className="w-56 px-2 py-2 font-medium">Stock</th>
                  <th className="px-4 py-2 sm:px-5">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {repuestos.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="font-medium">{r.descripcion}</span>
                      <span className="block text-xs text-slate-500">{r.codigo}</span>
                    </td>
                    <td className="px-2 py-3">{r.categoria}</td>
                    <td className="px-2 py-3 text-slate-600 dark:text-slate-400">{r.ubicacion ?? '—'}</td>
                    <td className="px-2 py-3">
                      <Stock repuesto={r} />
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex justify-end gap-2">
                        <Boton variante="secundario" className="px-2.5 py-1" onClick={() => setHistorial(r)}>
                          Movimientos
                        </Boton>
                        {esSupervisor && (
                          <>
                            <Boton variante="secundario" className="px-2.5 py-1" onClick={() => setIngresando(r)}>
                              Ingreso
                            </Boton>
                            <Boton variante="secundario" className="px-2.5 py-1" onClick={() => setEditando(r)}>
                              Editar
                            </Boton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <FormularioRepuesto
        repuesto={editando}
        categorias={categorias}
        alCerrar={() => setEditando(null)}
        alGuardar={() => {
          setEditando(null)
          recargar()
        }}
      />
      <IngresoStock
        repuesto={ingresando}
        alCerrar={() => setIngresando(null)}
        alGuardar={() => {
          setIngresando(null)
          recargar()
        }}
      />
      <Historial repuesto={historial} alCerrar={() => setHistorial(null)} />
    </>
  )
}

function Stock({ repuesto: r }) {
  const escala = Math.max(r.stock_actual, r.stock_minimo * 2, 1)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {r.stock_actual} <span className="text-xs font-normal text-slate-500">{abreviarUnidad(r.unidad)}</span>
        </span>
        {r.bajo_stock ? <StockBajo /> : <span className="text-xs text-slate-500">mín. {r.stock_minimo}</span>}
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div
          className="h-full rounded-full"
          style={{
            width: `${(r.stock_actual / escala) * 100}%`,
            background: r.bajo_stock ? 'var(--estado-critico)' : 'var(--serie-1)',
          }}
        />
        <div
          className="absolute -top-1 h-3.5 w-0.5 bg-slate-500"
          style={{ left: `${(r.stock_minimo / escala) * 100}%` }}
          title={`Stock mínimo: ${r.stock_minimo}`}
        />
      </div>
      {r.bajo_stock && <span className="mt-1 block text-xs text-slate-500">mínimo {r.stock_minimo}</span>}
    </div>
  )
}

function FormularioRepuesto({ repuesto, categorias, alCerrar, alGuardar }) {
  const { perfil } = useSesion()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const esNuevo = repuesto && !repuesto.id

  async function guardar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const valores = {
      codigo: f.get('codigo').trim().toUpperCase(),
      descripcion: f.get('descripcion').trim(),
      categoria: f.get('categoria').trim(),
      unidad: f.get('unidad'),
      ubicacion: f.get('ubicacion').trim() || null,
      stock_minimo: Number(f.get('minimo')),
      activo: esNuevo || f.get('activo') === 'on',
    }
    setEnviando(true)
    setError('')

    if (esNuevo) {
      // El stock arranca en 0 y el inicial se carga como un ingreso, así
      // queda en el historial de movimientos.
      const { data, error } = await supabase.from('repuestos').insert(valores).select('id').single()
      const inicial = Number(f.get('inicial'))
      const resultado =
        error || !inicial
          ? { error }
          : await supabase.from('movimientos_stock').insert({
              repuesto_id: data.id,
              tipo: 'ingreso',
              cantidad: inicial,
              motivo: 'Stock inicial',
              usuario_id: perfil.id,
            })
      setEnviando(false)
      if (resultado.error) return setError(mensajeError(resultado.error))
    } else {
      const { error } = await supabase.from('repuestos').update(valores).eq('id', repuesto.id)
      setEnviando(false)
      if (error) return setError(mensajeError(error))
    }
    alGuardar()
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo repuesto' : `Editar ${repuesto?.codigo ?? ''}`} abierto={Boolean(repuesto)} alCerrar={alCerrar}>
      {repuesto && (
        <form className="grid gap-4" onSubmit={guardar}>
          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <Campo
              etiqueta="Código"
              name="codigo"
              required
              pattern="[A-Za-z]{2,4}-[0-9]{3,5}"
              title="Letras, guion y números. Ej.: ROD-6206"
              placeholder="ROD-6206"
              defaultValue={repuesto.codigo}
            />
            <Campo etiqueta="Descripción" name="descripcion" required minLength={3} maxLength={120} defaultValue={repuesto.descripcion} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Categoría" name="categoria" required list="categorias" defaultValue={repuesto.categoria} />
            <datalist id="categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Campo etiqueta="Unidad" como="select" name="unidad" defaultValue={repuesto.unidad ?? 'unidad'}>
              <option value="unidad">Unidad</option>
              <option value="litro">Litro</option>
              <option value="kg">Kilogramo</option>
              <option value="metro">Metro</option>
            </Campo>
            <Campo etiqueta="Ubicación en el pañol" name="ubicacion" placeholder="Pañol A-01" defaultValue={repuesto.ubicacion ?? ''} />
            <Campo etiqueta="Stock mínimo" type="number" name="minimo" min="0" step="1" required defaultValue={repuesto.stock_minimo ?? 1} />
            {esNuevo && <Campo etiqueta="Stock inicial" type="number" name="inicial" min="0" step="1" defaultValue="0" />}
          </div>
          {!esNuevo && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" defaultChecked={repuesto.activo} className="size-4 accent-amber-500" />
              Repuesto activo (desmarcar para darlo de baja)
            </label>
          )}
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

function IngresoStock({ repuesto, alCerrar, alGuardar }) {
  const { perfil } = useSesion()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    const { error } = await supabase.from('movimientos_stock').insert({
      repuesto_id: repuesto.id,
      tipo: 'ingreso',
      cantidad: Number(f.get('cantidad')),
      motivo: f.get('motivo').trim() || 'Ingreso',
      usuario_id: perfil.id,
    })
    setEnviando(false)
    if (error) return setError(mensajeError(error))
    alGuardar()
  }

  return (
    <Modal titulo="Registrar ingreso de stock" abierto={Boolean(repuesto)} alCerrar={alCerrar}>
      {repuesto && (
        <form className="grid gap-4" onSubmit={guardar}>
          <p className="text-sm">
            <strong>{repuesto.descripcion}</strong>
            <span className="block text-slate-500">
              Stock actual: {repuesto.stock_actual} {abreviarUnidad(repuesto.unidad)} · mínimo {repuesto.stock_minimo}
            </span>
          </p>
          <Campo etiqueta="Cantidad que ingresa" type="number" name="cantidad" min="1" step="1" required autoFocus />
          <Campo etiqueta="Motivo" name="motivo" placeholder="Ej.: Compra OC-2402" />
          <Aviso>{error}</Aviso>
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={alCerrar}>
              Cancelar
            </Boton>
            <Boton type="submit" disabled={enviando}>
              Registrar ingreso
            </Boton>
          </div>
        </form>
      )}
    </Modal>
  )
}

function Historial({ repuesto, alCerrar }) {
  const id = repuesto?.id
  const { datos, error, cargando } = useConsulta(
    () =>
      id
        ? supabase
            .from('movimientos_stock')
            .select('id, tipo, cantidad, motivo, fecha, orden_id, usuario:perfiles(nombre)')
            .eq('repuesto_id', id)
            .order('fecha', { ascending: false })
        : Promise.resolve({ data: [] }),
    [id],
  )

  return (
    <Modal titulo={`Movimientos · ${repuesto?.codigo ?? ''}`} abierto={Boolean(repuesto)} alCerrar={alCerrar}>
      {repuesto && (
        <>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{repuesto.descripcion}</p>
          <Aviso>{error}</Aviso>
          {cargando ? (
            <Cargando />
          ) : datos.length === 0 ? (
            <Vacio>Sin movimientos.</Vacio>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-800">
              {datos.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 py-2.5">
                  <span>
                    {m.orden_id ? (
                      <Link to={`/ordenes/${m.orden_id}`} className="font-medium hover:underline">
                        Retiro para {codigoOrden(m.orden_id)}
                      </Link>
                    ) : (
                      <span className="font-medium">{m.motivo ?? (m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso')}</span>
                    )}
                    <span className="block text-xs text-slate-500">
                      {fechaHora(m.fecha)} · {m.usuario?.nombre ?? 'Sistema'}
                    </span>
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      m.tipo === 'ingreso' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.tipo === 'ingreso' ? '+' : '−'}
                    {m.cantidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  )
}
