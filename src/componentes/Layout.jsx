import { NavLink, Outlet } from 'react-router-dom'
import { useSesion } from '../lib/useSesion'

const secciones = [
  { a: '/', texto: 'Panel', fin: true },
  { a: '/ordenes', texto: 'Órdenes de trabajo' },
  { a: '/equipos', texto: 'Equipos' },
  { a: '/repuestos', texto: 'Repuestos' },
]

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="./favicon.svg" alt="" className="size-8" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Mantenimiento de Planta</span>
        <span className="hidden text-xs text-slate-400 sm:block">Órdenes de trabajo y repuestos</span>
      </span>
    </span>
  )
}

export default function Layout() {
  const { perfil, esSupervisor, salir } = useSesion()

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white dark:border-b dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-right leading-tight">
              <span className="block font-medium">{perfil.nombre}</span>
              <span className="block text-xs text-slate-400">
                {esSupervisor ? 'Supervisor' : 'Técnico'}
                {perfil.puesto && <span className="hidden sm:inline"> · {perfil.puesto}</span>}
              </span>
            </span>
            <button
              onClick={salir}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-4" aria-label="Secciones">
          <ul className="flex gap-1">
            {secciones.map((s) => (
              <li key={s.a}>
                <NavLink
                  to={s.a}
                  end={s.fin}
                  className={({ isActive }) =>
                    `block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                      isActive
                        ? 'border-amber-400 text-white'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`
                  }
                >
                  {s.texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Demo con datos de prueba inventados. Los cambios se borran todas las noches.
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
