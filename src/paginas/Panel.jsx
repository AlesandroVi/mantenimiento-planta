import { Link } from 'react-router-dom'
import { Barras, BarrasApiladas } from '../componentes/graficos'
import { Prioridad, StockBajo } from '../componentes/insignias'
import { Aviso, Boton, Cargando, Encabezado, IconoAlerta, Tarjeta, Vacio } from '../componentes/ui'
import {
  ESTADOS_ORDEN,
  PRIORIDADES,
  TIPOS_ORDEN,
  abreviarUnidad,
  codigoOrden,
  descargarCsv,
  fecha,
  fechaHora,
  haceCuanto,
  numero,
} from '../lib/formato'
import { useSesion } from '../lib/useSesion'
import { supabase } from '../lib/supabase'
import { useConsulta } from '../lib/useConsulta'

export default function Panel() {
  const { perfil } = useSesion()
  const { datos, error, cargando } = useConsulta(() => ({
    ordenes: supabase
      .from('ordenes_trabajo')
      .select(
        'id, titulo, estado, prioridad, tipo, creado_en, fecha_programada, iniciado_en, cerrado_en, horas_trabajadas, equipo:equipos(codigo, nombre, area), asignado:perfiles!ordenes_trabajo_asignado_a_fkey(nombre)',
      )
      .order('creado_en', { ascending: false }),
    bajoStock: supabase
      .from('repuestos')
      .select('id, codigo, descripcion, stock_actual, stock_minimo, unidad')
      .eq('bajo_stock', true)
      .eq('activo', true)
      .order('stock_actual'),
    equipos: supabase.from('equipos').select('id, estado').eq('activo', true),
    porArea: supabase.from('reporte_ordenes_por_area').select('*').order('area'),
    tiempos: supabase.from('reporte_tiempos_por_tipo').select('*'),
    consumo: supabase
      .from('reporte_consumo_repuestos')
      .select('*')
      .order('cantidad_consumida', { ascending: false })
      .limit(6),
  }))

  if (cargando && !datos) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>

  const { ordenes, bajoStock, equipos, porArea, tiempos, consumo } = datos
  const pendientes = ordenes.filter((o) => o.estado === 'pendiente')
  const enCurso = ordenes.filter((o) => o.estado === 'en_curso')
  const cerradas30 = porArea.reduce((suma, a) => suma + a.cerradas_30_dias, 0)
  const urgentes = ordenes.filter((o) => o.estado !== 'cerrada' && ['alta', 'critica'].includes(o.prioridad))
  const proximas = pendientes
    .filter((o) => o.fecha_programada)
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))
    .slice(0, 5)
  const fueraDeServicio = equipos.filter((e) => e.estado === 'fuera_de_servicio').length
  const enMantenimiento = equipos.filter((e) => e.estado === 'en_mantenimiento').length

  function exportarOrdenes() {
    descargarCsv(`ordenes-de-trabajo-${new Date().toISOString().slice(0, 10)}.csv`, [
      { titulo: 'Código', valor: (o) => codigoOrden(o.id) },
      { titulo: 'Equipo', valor: (o) => `${o.equipo.codigo} ${o.equipo.nombre}` },
      { titulo: 'Área', valor: (o) => o.equipo.area },
      { titulo: 'Título', valor: (o) => o.titulo },
      { titulo: 'Tipo', valor: (o) => TIPOS_ORDEN[o.tipo] },
      { titulo: 'Prioridad', valor: (o) => PRIORIDADES[o.prioridad] },
      { titulo: 'Estado', valor: (o) => ESTADOS_ORDEN[o.estado] },
      { titulo: 'Asignada a', valor: (o) => o.asignado?.nombre ?? '' },
      { titulo: 'Creada', valor: (o) => fechaHora(o.creado_en) },
      { titulo: 'Iniciada', valor: (o) => (o.iniciado_en ? fechaHora(o.iniciado_en) : '') },
      { titulo: 'Cerrada', valor: (o) => (o.cerrado_en ? fechaHora(o.cerrado_en) : '') },
      { titulo: 'Horas trabajadas', valor: (o) => o.horas_trabajadas ?? '' },
    ], ordenes)
  }

  return (
    <>
      <Encabezado titulo={`Hola, ${perfil.nombre.split(' ')[0]}`} descripcion="Estado del mantenimiento de la planta.">
        <Boton variante="secundario" onClick={exportarOrdenes}>
          Exportar órdenes (CSV)
        </Boton>
      </Encabezado>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Indicador titulo="Órdenes pendientes" valor={pendientes.length} a="/ordenes?estado=pendiente" />
        <Indicador titulo="En curso" valor={enCurso.length} a="/ordenes?estado=en_curso" />
        <Indicador titulo="Cerradas (30 días)" valor={cerradas30} a="/ordenes?estado=cerrada" />
        <Indicador
          titulo="Repuestos con stock bajo"
          valor={bajoStock.length}
          alerta={bajoStock.length > 0}
          a="/repuestos?bajo=1"
        />
        <Indicador
          titulo="Equipos fuera de servicio"
          valor={fueraDeServicio}
          detalle={`${enMantenimiento} en mantenimiento`}
          alerta={fueraDeServicio > 0}
          a="/equipos"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Órdenes por área">
          {porArea.length ? (
            <BarrasApiladas
              filas={porArea.map((a) => ({ etiqueta: a.area, valores: a }))}
              series={[
                { clave: 'pendientes', nombre: 'Pendientes', color: 'var(--serie-1)' },
                { clave: 'en_curso', nombre: 'En curso', color: 'var(--serie-2)' },
                { clave: 'cerradas_30_dias', nombre: 'Cerradas (30 días)', color: 'var(--serie-3)' },
              ]}
            />
          ) : (
            <Vacio>Todavía no hay órdenes.</Vacio>
          )}
        </Tarjeta>

        <Tarjeta titulo="Repuestos más usados (90 días)">
          {consumo.length ? (
            <Barras
              color="var(--serie-1)"
              filas={consumo.map((c) => ({
                etiqueta: `${c.codigo} · ${c.descripcion}`,
                detalle: c.descripcion,
                valor: c.cantidad_consumida,
                unidad: abreviarUnidad(c.unidad),
              }))}
            />
          ) : (
            <Vacio>No hubo consumos en los últimos 90 días.</Vacio>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Requieren atención" className="lg:col-span-2">
          {urgentes.length === 0 && bajoStock.length === 0 ? (
            <Vacio>Nada urgente por ahora.</Vacio>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {urgentes.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/ordenes/${o.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:text-amber-700 dark:hover:text-amber-300"
                  >
                    <Prioridad prioridad={o.prioridad} />
                    <span className="font-medium">{o.titulo}</span>
                    <span className="text-slate-500">
                      {o.equipo.codigo} · {ESTADOS_ORDEN[o.estado].toLowerCase()} · {haceCuanto(o.creado_en)}
                    </span>
                  </Link>
                </li>
              ))}
              {bajoStock.map((r) => (
                <li key={`r${r.id}`}>
                  <Link
                    to="/repuestos?bajo=1"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:text-amber-700 dark:hover:text-amber-300"
                  >
                    <StockBajo />
                    <span className="font-medium">{r.descripcion}</span>
                    <span className="text-slate-500">
                      quedan {r.stock_actual} (mínimo {r.stock_minimo})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <div className="grid grid-cols-1 gap-6">
          <Tarjeta titulo="Tiempos de resolución (90 días)">
            {tiempos.length ? (
              <dl className="grid gap-4">
                {tiempos.map((t) => (
                  <div key={t.tipo}>
                    <dt className="text-sm text-slate-600 dark:text-slate-400">
                      {TIPOS_ORDEN[t.tipo]} · {t.cerradas} cerradas
                    </dt>
                    <dd className="mt-0.5">
                      <span className="text-2xl font-semibold tabular-nums">{numero(t.horas_promedio_resolucion)} h</span>
                      <span className="ml-2 text-sm text-slate-500">
                        promedio · {numero(t.horas_hombre_promedio)} h-hombre
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Vacio>Sin órdenes cerradas en el período.</Vacio>
            )}
          </Tarjeta>

          <Tarjeta titulo="Próximos trabajos programados">
            {proximas.length ? (
              <ul className="space-y-2 text-sm">
                {proximas.map((o) => (
                  <li key={o.id}>
                    <Link to={`/ordenes/${o.id}`} className="flex justify-between gap-3 hover:text-amber-700 dark:hover:text-amber-300">
                      <span className="min-w-0 truncate">
                        {o.equipo.codigo} · {o.titulo}
                      </span>
                      <span className="text-slate-500 tabular-nums">{fecha(o.fecha_programada)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Vacio>No hay trabajos programados.</Vacio>
            )}
          </Tarjeta>
        </div>
      </div>
    </>
  )
}

function Indicador({ titulo, valor, detalle, alerta = false, a }) {
  return (
    <Link
      to={a}
      className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow dark:bg-slate-900 ${
        alerta ? 'border-red-300 dark:border-red-900' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
        {alerta && <IconoAlerta className="size-3.5 text-[var(--estado-critico)]" />}
        {titulo}
      </span>
      <span className="mt-1 block text-3xl font-semibold tabular-nums">{valor}</span>
      {detalle && <span className="text-xs text-slate-500">{detalle}</span>}
    </Link>
  )
}
