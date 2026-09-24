'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import { setWorkerUrl } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import MapGL, { type MapRef, Marker, NavigationControl } from 'react-map-gl/maplibre'

// Free vector tiles, no API key (https://openfreemap.org); MapLibre shows the credit.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// The bundler does not emit MapLibre's worker file; it is copied to /public/maplibre
// by scripts/copy-maplibre-worker.mjs (predev/prebuild).
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

export type Coordinates = { latitude: number; longitude: number }

type LocationPickerProps = {
  value: Coordinates | null
  onChange: (value: Coordinates) => void
  /** Where to start when there is no value yet. */
  fallbackCenter: Coordinates
  /** Changes only when the map should move by itself (an address picked in the search). */
  focusOn?: Coordinates | null
}

/** Map where the admin clicks or drags the pin to set the point's exact position. */
export default function LocationPicker({
  value,
  onChange,
  fallbackCenter,
  focusOn,
}: LocationPickerProps) {
  const mapRef = useRef<MapRef>(null)
  const center = value ?? fallbackCenter

  // Clicking or dragging keeps the view; a searched address moves the map to it.
  useEffect(() => {
    if (focusOn) {
      mapRef.current?.flyTo({ center: [focusOn.longitude, focusOn.latitude], zoom: 16 })
    }
  }, [focusOn])

  return (
    <div className="h-80 overflow-hidden rounded-lg border">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: center.longitude,
          latitude: center.latitude,
          zoom: value ? 16 : 12,
        }}
        mapStyle={MAP_STYLE}
        cursor="crosshair"
        onClick={(event) =>
          onChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })
        }
      >
        <NavigationControl position="top-right" showCompass={false} />
        {value ? (
          <Marker
            longitude={value.longitude}
            latitude={value.latitude}
            color="#22c55e"
            draggable
            onDragEnd={(event) =>
              onChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })
            }
          />
        ) : null}
      </MapGL>
    </div>
  )
}
