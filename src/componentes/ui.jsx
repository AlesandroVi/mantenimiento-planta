import { useEffect, useId, useRef } from 'react'

const variantesBoton = {
  primario:
    'bg-slate-900 text-white hover:bg-slate-700 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300',
  secundario:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  acento: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
  peligro: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300',
}

export function Boton({ variante = 'primario', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-50 ${variantesBoton[variante]} ${className}`}
      {...props}
    />
  )
}

const claseEntrada =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-2 focus:outline-amber-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

export function Campo({ etiqueta, ayuda, como = 'input', children, className = '', ...props }) {
  const id = useId()
  const Elemento = como
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {etiqueta}
      </label>
      <Elemento id={id} className={`w-full ${claseEntrada}`} {...props}>
        {children}
      </Elemento>
      {ayuda && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ayuda}</p>}
    </div>
  )
}

export function Buscador({ className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 20 20" aria-hidden="true" className="pointer-events-none absolute top-2.5 left-3 size-4 fill-slate-400">
        <path d="M8.5 3a5.5 5.5 0 1 0 3.3 9.9l3.6 3.6a1 1 0 0 0 1.4-1.4l-3.6-3.6A5.5 5.5 0 0 0 8.5 3Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
      </svg>
      <input type="search" className={`w-full pl-9 ${claseEntrada}`} {...props} />
    </div>
  )
}

export function Selector({ className = '', children, ...props }) {
  return (
    <select className={`${claseEntrada} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Tarjeta({ titulo, accion, className = '', children }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {(titulo || accion) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

export function Encabezado({ titulo, descripcion, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

const tonosInsignia = {
  gris: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  azul: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
  verde: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
  rojo: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
}

export function Insignia({ tono = 'gris', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${tonosInsignia[tono]}`}
    >
      {children}
    </span>
  )
}

export function Aviso({ tono = 'error', children }) {
  if (!children) return null
  const estilos =
    tono === 'error'
      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
  return (
    <p role={tono === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </p>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
      {texto}
    </div>
  )
}

export function Vacio({ children }) {
  return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>
}

export function Modal({ titulo, abierto, alCerrar, children }) {
  const dialogo = useRef(null)

  useEffect(() => {
    const d = dialogo.current
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      onClose={alCerrar}
      onClick={(e) => e.target === dialogo.current && alCerrar()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-100"
    >
      {abierto && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <button
              onClick={alCerrar}
              aria-label="Cerrar"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 20 20" className="size-5 fill-current" aria-hidden="true">
                <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

// Ícono de alerta para acompañar los colores de estado (nunca color solo).
export function IconoAlerta({ className = 'size-4' }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`fill-current ${className}`}>
      <path d="M8.3 3.2a2 2 0 0 1 3.4 0l6 10.4A2 2 0 0 1 16 16.6H4a2 2 0 0 1-1.7-3l6-10.4ZM10 7a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  )
}
