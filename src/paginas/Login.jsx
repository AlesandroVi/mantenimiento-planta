import { useState } from 'react'
import { Logo } from '../componentes/Layout'
import { Aviso, Boton, Campo } from '../componentes/ui'
import { mensajeError, supabase } from '../lib/supabase'

// Cuentas públicas de la demo (datos inventados, ver supabase/seed.sql).
const CLAVE_DEMO = 'PlantaDemo2026'
const cuentasDemo = [
  {
    rol: 'Supervisor',
    email: 'supervisor.demo@example.com',
    detalle: 'Administra equipos y repuestos, crea y asigna órdenes, carga ingresos de stock.',
  },
  {
    rol: 'Técnico',
    email: 'tecnico.demo@example.com',
    detalle: 'Reporta fallas, toma y cierra sus órdenes y retira repuestos del pañol.',
  },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function ingresar(credenciales) {
    setEnviando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword(credenciales)
    if (error) {
      setError(mensajeError(error))
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="bg-slate-900 px-6 py-8 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div className="mt-8 lg:mt-0">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-4xl">
            Control de mantenimiento e inventario de repuestos
          </h1>
          <p className="mt-4 max-w-md text-sm text-slate-300 lg:text-base">
            Equipos de la planta, órdenes de trabajo preventivas y correctivas, stock del pañol con alertas y
            reportes para la jefatura de mantenimiento.
          </p>
        </div>
        <p className="mt-8 text-xs text-slate-500 lg:mt-0">
          Proyecto de portfolio · React + Supabase · Datos de prueba inventados
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold">Probar la demo</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Entrá con un rol para ver qué puede hacer cada uno.
          </p>

          <div className="mt-5 grid gap-3">
            {cuentasDemo.map((c) => (
              <button
                key={c.email}
                disabled={enviando}
                onClick={() => ingresar({ email: c.email, password: CLAVE_DEMO })}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-400 hover:shadow focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex items-center justify-between font-medium">
                  Entrar como {c.rol.toLowerCase()}
                  <span aria-hidden="true" className="text-amber-500">→</span>
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">{c.detalle}</span>
              </button>
            ))}
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />o con tu usuario
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              ingresar({ email, password: clave })
            }}
          >
            <Campo
              etiqueta="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Campo
              etiqueta="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
            <Aviso>{error}</Aviso>
            <Boton type="submit" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </Boton>
          </form>
        </div>
      </main>
    </div>
  )
}
