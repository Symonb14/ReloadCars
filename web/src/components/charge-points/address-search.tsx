'use client'

import { useQueryClient } from '@tanstack/react-query'
import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getGetPlaceQueryOptions,
  useGetPlaceSuggestions,
} from '@/api/generated/places/places'
import { Input } from '@/components/ui/input'
import type { Coordinates } from './location-picker'

type AddressSearchProps = {
  near: Coordinates
  onSelect: (place: { address: string; latitude: number; longitude: number }) => void
}

/** Address/establishment search (Mapbox via the API) that positions the pin. */
export function AddressSearch({ near, onSelect }: AddressSearchProps) {
  const queryClient = useQueryClient()
  // One Mapbox search session per picked result.
  const [sessionToken, setSessionToken] = useState(() => crypto.randomUUID())
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(timeout)
  }, [query])

  const suggestions = useGetPlaceSuggestions(
    { q: debounced, sessionToken, lat: near.latitude, lng: near.longitude },
    { query: { enabled: debounced.length >= 3, staleTime: 60_000 } },
  )

  async function pick(id: string) {
    try {
      const place = await queryClient.fetchQuery(
        getGetPlaceQueryOptions(id, { sessionToken }),
      )
      onSelect({
        address: place.address ?? place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      })
      setQuery('')
      setOpen(false)
      setSessionToken(crypto.randomUUID())
    } catch {
      toast.error('Não foi possível obter a posição deste endereço.')
    }
  }

  const items = debounced.length >= 3 ? (suggestions.data?.suggestions ?? []) : []

  return (
    <div className="relative">
      <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar endereço ou estabelecimento para posicionar o pino…"
        className="pl-9"
        aria-label="Buscar endereço"
      />
      {open && items.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(item.id)}
                className="w-full rounded-md px-3 py-2 text-left hover:bg-muted"
              >
                <div className="font-medium text-sm">{item.name}</div>
                {item.address ? (
                  <div className="text-muted-foreground text-xs">{item.address}</div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
