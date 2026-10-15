import { ESTADOS_EQUIPO, ESTADOS_ORDEN, PRIORIDADES } from '../lib/formato'
import { IconoAlerta, Insignia } from './ui'

const tonoEstadoOrden = { pendiente: 'ambar', en_curso: 'azul', cerrada: 'verde' }
const tonoPrioridad = { baja: 'gris', media: 'gris', alta: 'ambar', critica: 'rojo' }
const tonoEstadoEquipo = { operativo: 'verde', en_mantenimiento: 'ambar', fuera_de_servicio: 'rojo' }

export const EstadoOrden = ({ estado }) => (
  <Insignia tono={tonoEstadoOrden[estado]}>{ESTADOS_ORDEN[estado]}</Insignia>
)

export const Prioridad = ({ prioridad }) => (
  <Insignia tono={tonoPrioridad[prioridad]}>
    {prioridad === 'critica' && <IconoAlerta className="size-3" />}
    {PRIORIDADES[prioridad]}
  </Insignia>
)

export const EstadoEquipo = ({ estado }) => (
  <Insignia tono={tonoEstadoEquipo[estado]}>
    {estado === 'fuera_de_servicio' && <IconoAlerta className="size-3" />}
    {ESTADOS_EQUIPO[estado]}
  </Insignia>
)

export const StockBajo = () => (
  <Insignia tono="rojo">
    <IconoAlerta className="size-3" />
    Stock bajo
  </Insignia>
)
