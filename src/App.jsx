import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout'
import { Cargando } from './componentes/ui'
import { useSesion } from './lib/useSesion'
import { configurado } from './lib/supabase'
import Equipos from './paginas/Equipos'
import Login from './paginas/Login'
import OrdenDetalle from './paginas/OrdenDetalle'
import Ordenes from './paginas/Ordenes'
import Panel from './paginas/Panel'
import Repuestos from './paginas/Repuestos'

export default function App() {
  const { sesion, cargando } = useSesion()

  if (!configurado) {
    return (
      <p className="mx-auto max-w-md p-8 text-sm">
        Falta configurar Supabase: copiá <code>.env.example</code> como <code>.env.local</code> y completá la URL
        y la clave publicable del proyecto.
      </p>
    )
  }

  if (cargando) return <Cargando />
  if (!sesion) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="ordenes/:id" element={<OrdenDetalle />} />
        <Route path="equipos" element={<Equipos />} />
        <Route path="repuestos" element={<Repuestos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
