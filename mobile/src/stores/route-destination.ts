import { create } from 'zustand'

type Target = {
  id: string
  name: string
  latitude: number
  longitude: number
}

/**
 * What the map is routing to:
 * - `charge-point`: "Ver rota" in the details sheet (route to that point);
 * - `place`: a searched destination (trip mode, with the points along the way).
 */
export type RouteDestination =
  | (Target & { kind: 'charge-point' })
  | (Target & { kind: 'place'; address: string | null })

type RouteDestinationStore = {
  destination: RouteDestination | null
  setDestination: (destination: RouteDestination) => void
  clear: () => void
}

export const useRouteDestination = create<RouteDestinationStore>((set) => ({
  destination: null,
  setDestination: (destination) => set({ destination }),
  clear: () => set({ destination: null }),
}))
