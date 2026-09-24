import { create } from 'zustand'

export type RouteDestination = {
  id: string
  name: string
  latitude: number
  longitude: number
}

type RouteDestinationStore = {
  destination: RouteDestination | null
  setDestination: (destination: RouteDestination) => void
  clear: () => void
}

/** Charge point whose route the map should draw ("Ver rota" in the details sheet). */
export const useRouteDestination = create<RouteDestinationStore>((set) => ({
  destination: null,
  setDestination: (destination) => set({ destination }),
  clear: () => set({ destination: null }),
}))
