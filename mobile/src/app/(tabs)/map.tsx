import Feather from '@expo/vector-icons/Feather'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import MapView, { Marker, Polyline, type Region } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SafeAreaView as TabsSafeAreaView } from 'react-native-screens/experimental'
import { useGetNearbyChargePoints } from '@/api/generated/charge-points/charge-points'
import { useGetDirections } from '@/api/generated/directions/directions'
import { useGetTrip } from '@/api/generated/trips/trips'
import { MAP_COLORS, pointColor } from '@/components/map/colors'
import { Legend, PermissionBanner, StatusPill } from '@/components/map/overlays'
import {
  describeRoutePosition,
  PointsAlongRoute,
} from '@/components/map/points-along-route'
import { RouteCard } from '@/components/map/route-card'
import { SearchBar } from '@/components/map/search-bar'
import { type Coordinates, useUserLocation } from '@/hooks/use-user-location'
import { formatDistance, formatDuration } from '@/lib/format'
import { chooseNavigationApp } from '@/lib/navigation-apps'
import { useRouteDestination } from '@/stores/route-destination'

const SEARCH_RADIUS_KM = 10
const INITIAL_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 }
const ROUTE_STALE_TIME = 5 * 60_000

export default function MapScreen() {
  const location = useUserLocation()

  if (location.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface">
        <ActivityIndicator color={MAP_COLORS.partner} />
        <Text className="text-muted">Buscando sua localização…</Text>
      </View>
    )
  }

  return (
    <ChargePointsMap
      userLocation={location.status === 'granted' ? location.coords : null}
      fallbackCenter={location.coords}
      permissionDenied={
        location.status === 'denied'
          ? { canAskAgain: location.canAskAgain, retry: location.retry }
          : null
      }
    />
  )
}

type ChargePointsMapProps = {
  userLocation: Coordinates | null
  fallbackCenter: Coordinates
  permissionDenied: { canAskAgain: boolean; retry: () => void } | null
}

function ChargePointsMap({
  userLocation,
  fallbackCenter,
  permissionDenied,
}: ChargePointsMapProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapView>(null)
  const origin = userLocation ?? fallbackCenter

  const destination = useRouteDestination((state) => state.destination)
  const clearDestination = useRouteDestination((state) => state.clear)
  const isTrip = destination?.kind === 'place'
  const isPointRoute = destination?.kind === 'charge-point'

  // Explore mode: points around a search center the user can move.
  const [searchCenter, setSearchCenter] = useState(origin)
  const [visibleCenter, setVisibleCenter] = useState(searchCenter)
  const movedAway = distanceInKm(searchCenter, visibleCenter) > SEARCH_RADIUS_KM / 3

  const nearby = useGetNearbyChargePoints(
    {
      lat: searchCenter.latitude,
      lng: searchCenter.longitude,
      radiusKm: SEARCH_RADIUS_KM,
    },
    { query: { enabled: !isTrip } },
  )

  const routeParams = {
    fromLat: origin.latitude,
    fromLng: origin.longitude,
    toLat: destination?.latitude ?? 0,
    toLng: destination?.longitude ?? 0,
  }
  // Route to a single charge point ("Ver rota").
  const directions = useGetDirections(routeParams, {
    query: { enabled: isPointRoute, staleTime: ROUTE_STALE_TIME },
  })
  // Trip to a searched destination, with the points along the way.
  const trip = useGetTrip(routeParams, {
    query: { enabled: isTrip, staleTime: ROUTE_STALE_TIME },
  })

  const route = isTrip ? trip.data?.route : isPointRoute ? directions.data : undefined
  const points = isTrip
    ? (trip.data?.chargePoints ?? [])
    : (nearby.data?.chargePoints ?? [])
  const loadingPoints = isTrip ? trip.isFetching : nearby.isFetching

  // Frame the whole route, leaving room for the bottom card.
  useEffect(() => {
    if (!route) return
    mapRef.current?.fitToCoordinates(route.coordinates, {
      edgePadding: { top: 140, right: 48, bottom: isTrip ? 380 : 260, left: 48 },
      animated: true,
    })
  }, [route, isTrip])

  function handleRegionChange(region: Region) {
    setVisibleCenter({ latitude: region.latitude, longitude: region.longitude })
  }

  function openPoint(id: string, params: { distanceMeters?: number; note?: string }) {
    router.push({
      pathname: '/charge-point/[id]',
      params: {
        id,
        ...(params.note ? { note: params.note } : {}),
        ...(params.distanceMeters !== undefined
          ? { distanceMeters: String(params.distanceMeters) }
          : {}),
      },
    })
  }

  function openSearch() {
    router.push({
      pathname: '/search',
      params: { lat: String(origin.latitude), lng: String(origin.longitude) },
    })
  }

  const routeSummary = route
    ? `${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)}`
    : null

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ ...origin, ...INITIAL_DELTA }}
        showsUserLocation={Boolean(userLocation)}
        showsMyLocationButton
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        onRegionChangeComplete={handleRegionChange}
      >
        {isTrip
          ? trip.data?.chargePoints.map((point) => (
              <Marker
                key={point.id}
                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                pinColor={pointColor(point.source)}
                accessibilityLabel={point.name}
                onPress={() =>
                  openPoint(point.id, { note: describeRoutePosition(point) })
                }
              />
            ))
          : nearby.data?.chargePoints.map((point) => (
              <Marker
                key={point.id}
                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                pinColor={pointColor(point.source)}
                accessibilityLabel={point.name}
                onPress={() =>
                  openPoint(point.id, { distanceMeters: point.distanceMeters })
                }
              />
            ))}

        {isTrip && destination ? (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            pinColor={MAP_COLORS.destination}
            title={destination.name}
          />
        ) : null}

        {route ? (
          <Polyline
            coordinates={route.coordinates}
            strokeColor={MAP_COLORS.route}
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      {/* Top overlays */}
      <View
        className="absolute inset-x-0 items-center gap-2 px-4"
        style={{ top: insets.top + 8 }}
        pointerEvents="box-none"
      >
        <SearchBar label={isTrip ? destination.name : undefined} onPress={openSearch} />

        {permissionDenied ? <PermissionBanner {...permissionDenied} /> : null}

        {movedAway && !isTrip ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSearchCenter(visibleCenter)}
            className="flex-row items-center gap-2 rounded-full bg-ink px-4 py-2 active:opacity-80"
          >
            <Feather name="search" size={14} color="#22c55e" />
            <Text className="text-sm font-semibold text-white">Buscar nesta área</Text>
          </Pressable>
        ) : null}

        {loadingPoints ? (
          <View className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2">
            <ActivityIndicator size="small" color={MAP_COLORS.partner} />
            <Text className="text-sm text-ink">
              {isTrip ? 'Calculando a viagem…' : 'Buscando pontos…'}
            </Text>
          </View>
        ) : null}

        {!isTrip && nearby.isError ? (
          <Pressable onPress={() => nearby.refetch()} className="active:opacity-80">
            <StatusPill
              tone="error"
              text="Erro ao buscar pontos. Toque para tentar de novo."
            />
          </Pressable>
        ) : null}

        {!isTrip && nearby.isSuccess && points.length === 0 && !loadingPoints ? (
          <StatusPill text={`Nenhum ponto num raio de ${SEARCH_RADIUS_KM} km.`} />
        ) : null}
      </View>

      {/* Bottom card, kept above the native tab bar. */}
      <TabsSafeAreaView
        edges={{ bottom: true }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        pointerEvents="box-none"
      >
        <View className="gap-2 px-4 pb-4" pointerEvents="box-none">
          {destination?.kind === 'place' ? (
            <RouteCard
              title="Viagem até"
              name={destination.name}
              summary={routeSummary}
              loading={trip.isFetching}
              failed={trip.isError}
              onNavigate={() => chooseNavigationApp(destination)}
              onClose={clearDestination}
            >
              {trip.data ? (
                <PointsAlongRoute
                  points={trip.data.chargePoints}
                  onSelect={(point) =>
                    openPoint(point.id, { note: describeRoutePosition(point) })
                  }
                />
              ) : null}
            </RouteCard>
          ) : destination?.kind === 'charge-point' ? (
            <RouteCard
              title="Rota até"
              name={destination.name}
              summary={routeSummary}
              loading={directions.isFetching}
              failed={directions.isError}
              onNavigate={() => chooseNavigationApp(destination)}
              onClose={clearDestination}
            />
          ) : (
            <Legend />
          )}
        </View>
      </TabsSafeAreaView>
    </View>
  )
}

/** Great-circle distance, good enough to decide when to offer a new search. */
function distanceInKm(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
