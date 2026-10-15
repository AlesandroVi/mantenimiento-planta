import { createContext, useContext } from 'react'

export const SesionContexto = createContext(null)

export const useSesion = () => useContext(SesionContexto)
