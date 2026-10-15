import { useState } from 'react'
import { numero } from '../lib/formato'

// Tooltip accesible: aparece al pasar el mouse o al enfocar con el teclado.
function Pista({ children }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg group-hover:visible group-focus-visible:visible dark:bg-slate-700"
    >
      {children}
    </span>
  )
}

function Leyenda({ series }) {
  return (
    <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      {series.map((s) => (
        <li key={s.clave} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
          {s.nombre}
        </li>
      ))}
    </ul>
  )
}

function Tabla({ filas, columnas }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
            {columnas.map((c, i) => (
              <th key={c.titulo} className={`py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.etiqueta} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              {columnas.map((c, i) => (
                <td key={c.titulo} className={`py-2 ${i > 0 ? 'text-right tabular-nums' : ''}`}>
                  {c.valor(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlternarTabla({ verTabla, setVerTabla }) {
  return (
    <button
      onClick={() => setVerTabla(!verTabla)}
      className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:hover:text-slate-200"
    >
      {verTabla ? 'Ver gráfico' : 'Ver tabla'}
    </button>
  )
}

// Barras horizontales apiladas. filas: [{ etiqueta, valores: { clave: n } }]
export function BarrasApiladas({ filas, series, unidad = '' }) {
  const [verTabla, setVerTabla] = useState(false)
  const totales = filas.map((f) => series.reduce((suma, s) => suma + (f.valores[s.clave] ?? 0), 0))
  const maximo = Math.max(...totales, 1)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <Leyenda series={series} />
        <AlternarTabla verTabla={verTabla} setVerTabla={setVerTabla} />
      </div>
      {verTabla ? (
        <Tabla
          filas={filas}
          columnas={[
            { titulo: '', valor: (f) => f.etiqueta },
            ...series.map((s) => ({ titulo: s.nombre, valor: (f) => f.valores[s.clave] ?? 0 })),
          ]}
        />
      ) : (
        <ul className="grid gap-3">
          {filas.map((f, i) => (
            <li key={f.etiqueta} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-sm">
              <span className="truncate text-slate-600 dark:text-slate-400" title={f.etiqueta}>
                {f.etiqueta}
              </span>
              <span className="flex h-5 gap-[2px]" style={{ width: `${(totales[i] / maximo) * 100}%` }}>
                {series.map((s) => {
                  const valor = f.valores[s.clave] ?? 0
                  if (!valor) return null
                  return (
                    <span
                      key={s.clave}
                      tabIndex={0}
                      className="group relative h-full first:rounded-l-[4px] last:rounded-r-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                      style={{ flexGrow: valor, background: s.color }}
                      aria-label={`${f.etiqueta}, ${s.nombre}: ${valor}${unidad}`}
                    >
                      <Pista>
                        {s.nombre}: <strong>{valor}</strong>
                        {unidad}
                      </Pista>
                    </span>
                  )
                })}
              </span>
              <span className="text-right text-xs font-medium text-slate-700 tabular-nums dark:text-slate-300">
                {totales[i]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Barras horizontales de una sola serie con el valor al final.
export function Barras({ filas, color, unidad = '' }) {
  const [verTabla, setVerTabla] = useState(false)
  const maximo = Math.max(...filas.map((f) => f.valor), 1)

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <AlternarTabla verTabla={verTabla} setVerTabla={setVerTabla} />
      </div>
      {verTabla ? (
        <Tabla
          filas={filas}
          columnas={[
            { titulo: '', valor: (f) => f.etiqueta },
            { titulo: 'Cantidad', valor: (f) => `${numero(f.valor)} ${f.unidad ?? unidad}` },
          ]}
        />
      ) : (
        <ul className="grid gap-3">
          {filas.map((f) => (
            <li key={f.etiqueta} className="text-sm">
              <span className="mb-1 block truncate text-slate-600 dark:text-slate-400" title={f.detalle}>
                {f.etiqueta}
              </span>
              <span className="flex items-center gap-2">
                <span
                  tabIndex={0}
                  className="group relative h-4 rounded-r-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                  style={{ width: `${(f.valor / maximo) * 85}%`, background: color }}
                  aria-label={`${f.detalle ?? f.etiqueta}: ${f.valor} ${f.unidad ?? unidad}`}
                >
                  <Pista>{f.detalle ?? f.etiqueta}</Pista>
                </span>
                <span className="text-xs font-medium whitespace-nowrap text-slate-700 tabular-nums dark:text-slate-300">
                  {numero(f.valor)} {f.unidad ?? unidad}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
