import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'

export type Coordinates = { latitude: number; longitude: number }

// Used when location permission is denied: Betim city center.
export const DEFAULT_LOCATION: Coordinates = { latitude: -19.9678, longitude: -44.1983 }

type UserLocation =
  | { status: 'loading' }
  | { status: 'granted'; coords: Coordinates }
  | { status: 'denied'; coords: Coordinates; canAskAgain: boolean }

/** Asks for "while using the app" permission and returns the current position. */
export function useUserLocation() {
  const [state, setState] = useState<UserLocation>({ status: 'loading' })

  const request = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync()

    if (!permission.granted) {
      setState({
        status: 'denied',
        coords: DEFAULT_LOCATION,
        canAskAgain: permission.canAskAgain,
      })
      return
    }

    // The last known position is instant; refine it with a fresh fix.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })
    if (last) setState({ status: 'granted', coords: pick(last.coords) })

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setState({ status: 'granted', coords: pick(current.coords) })
    } catch {
      if (!last) setState({ status: 'granted', coords: DEFAULT_LOCATION })
    }
  }, [])

  useEffect(() => {
    request()
  }, [request])

  return { ...state, retry: request }
}

function pick({ latitude, longitude }: Coordinates): Coordinates {
  return { latitude, longitude }
}
