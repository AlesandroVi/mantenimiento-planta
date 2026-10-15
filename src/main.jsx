import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { ProveedorSesion } from './lib/sesion.jsx'
import './index.css'

// HashRouter: GitHub Pages sirve archivos estáticos y no sabe redirigir
// rutas como /ordenes/3 al index.html.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </HashRouter>
  </StrictMode>,
)
