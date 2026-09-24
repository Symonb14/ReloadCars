import Feather from '@expo/vector-icons/Feather'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import MapView, { Marker, Polyline, type Region } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SafeAreaView as TabsSafeAreaView } from 'react-native-screens/experimental'
import { useGetNearbyChargePoints } from '@/api/generated/charge-points/charge-points'
import { useGetDirections } from '@/api/generated/directions/directions'
import { Button } from '@/components/button'
import { type Coordinates, useUserLocation } from '@/hooks/use-user-location'
import { formatDistance, formatDuration } from '@/lib/format'
import { chooseNavigationApp } from '@/lib/navigation-apps'
import { useRouteDestination } from '@/stores/route-destination'

const SEARCH_RADIUS_KM = 10
const INITIAL_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 }
const COLORS = { partner: '#22c55e', public: '#9ca3af', route: '#16a34a' }

export default function MapScreen() {
  const location = useUserLocation()

  if (location.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface">
        <ActivityIndicator color={COLORS.partner} />
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

  const [searchCenter, setSearchCenter] = useState(userLocation ?? fallbackCenter)
  const [visibleCenter, setVisibleCenter] = useState(searchCenter)
  const movedAway = distanceInKm(searchCenter, visibleCenter) > SEARCH_RADIUS_KM / 3

  const nearby = useGetNearbyChargePoints({
    lat: searchCenter.latitude,
    lng: searchCenter.longitude,
    radiusKm: SEARCH_RADIUS_KM,
  })

  const destination = useRouteDestination((state) => state.destination)
  const clearDestination = useRouteDestination((state) => state.clear)
  const origin = userLocation ?? fallbackCenter

  const directions = useGetDirections(
    {
      fromLat: origin.latitude,
      fromLng: origin.longitude,
      toLat: destination?.latitude ?? 0,
      toLng: destination?.longitude ?? 0,
    },
    { query: { enabled: Boolean(destination), staleTime: 5 * 60_000 } },
  )
  const route = destination ? directions.data : undefined

  // Frame the whole route when it arrives.
  useEffect(() => {
    if (!route) return
    mapRef.current?.fitToCoordinates(route.coordinates, {
      edgePadding: { top: 120, right: 48, bottom: 260, left: 48 },
      animated: true,
    })
  }, [route])

  function handleRegionChange(region: Region) {
    setVisibleCenter({ latitude: region.latitude, longitude: region.longitude })
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ ...(userLocation ?? fallbackCenter), ...INITIAL_DELTA }}
        showsUserLocation={Boolean(userLocation)}
        showsMyLocationButton
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        onRegionChangeComplete={handleRegionChange}
      >
        {nearby.data?.chargePoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            pinColor={point.source === 'partner' ? COLORS.partner : COLORS.public}
            accessibilityLabel={point.name}
            onPress={() =>
              router.push({
                pathname: '/charge-point/[id]',
                params: { id: point.id, distanceMeters: String(point.distanceMeters) },
              })
            }
          />
        ))}

        {route ? (
          <Polyline
            coordinates={route.coordinates}
            strokeColor={COLORS.route}
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
        {permissionDenied ? <PermissionBanner {...permissionDenied} /> : null}

        {movedAway ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSearchCenter(visibleCenter)}
            className="flex-row items-center gap-2 rounded-full bg-ink px-4 py-2 active:opacity-80"
          >
            <Feather name="search" size={14} color="#22c55e" />
            <Text className="text-sm font-semibold text-white">Buscar nesta área</Text>
          </Pressable>
        ) : null}

        {nearby.isFetching ? (
          <View className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2">
            <ActivityIndicator size="small" color={COLORS.partner} />
            <Text className="text-sm text-ink">Buscando pontos…</Text>
          </View>
        ) : null}

        {nearby.isError ? (
          <Pressable
            onPress={() => nearby.refetch()}
            className="rounded-full bg-danger px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-white">
              Erro ao buscar pontos. Toque para tentar de novo.
            </Text>
          </Pressable>
        ) : null}

        {nearby.data?.chargePoints.length === 0 && !nearby.isFetching ? (
          <View className="rounded-full bg-white px-4 py-2">
            <Text className="text-sm text-ink">
              Nenhum ponto num raio de {SEARCH_RADIUS_KM} km.
            </Text>
          </View>
        ) : null}
      </View>

      {/* Bottom: route summary or legend, kept above the native tab bar. */}
      <TabsSafeAreaView
        edges={{ bottom: true }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        pointerEvents="box-none"
      >
        <View className="gap-2 px-4 pb-4" pointerEvents="box-none">
          {destination ? (
            <RouteCard
              name={destination.name}
              loading={directions.isFetching}
              failed={directions.isError}
              summary={
                route
                  ? `${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)}`
                  : null
              }
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

function RouteCard(props: {
  name: string
  summary: string | null
  loading: boolean
  failed: boolean
  onNavigate: () => void
  onClose: () => void
}) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4 shadow-lg">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-semibold uppercase text-muted">Rota até</Text>
          <Text className="text-lg font-bold text-ink" numberOfLines={1}>
            {props.name}
          </Text>
          {props.loading ? <Text className="text-muted">Calculando rota…</Text> : null}
          {props.failed ? (
            <Text className="text-danger">Não foi possível calcular a rota.</Text>
          ) : null}
          {props.summary ? (
            <Text className="text-base font-semibold text-brand-pressed">
              {props.summary}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar rota"
          onPress={props.onClose}
          className="size-9 items-center justify-center rounded-full bg-field active:opacity-80"
        >
          <Feather name="x" size={18} color="#111827" />
        </Pressable>
      </View>
      <Button title="Como chegar" onPress={props.onNavigate} />
      {/* Required attribution for Mapbox Directions on a non-Mapbox map. */}
      <Text className="text-center text-[10px] text-muted">© Mapbox © OpenStreetMap</Text>
    </View>
  )
}

function Legend() {
  return (
    <View className="flex-row items-center justify-center gap-4 self-center rounded-full bg-white/90 px-4 py-2">
      <LegendItem color={COLORS.partner} label="Parceiros" />
      <LegendItem color={COLORS.public} label="Pontos públicos" />
    </View>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="size-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-ink">{label}</Text>
    </View>
  )
}

function PermissionBanner({
  canAskAgain,
  retry,
}: {
  canAskAgain: boolean
  retry: () => void
}) {
  return (
    <View className="w-full gap-2 rounded-2xl bg-white p-4 shadow-lg">
      <Text className="font-semibold text-ink">Localização desativada</Text>
      <Text className="text-sm text-muted">
        Mostrando pontos de Betim. Ative a localização para ver os pontos perto de você.
      </Text>
      <Button
        title={canAskAgain ? 'Permitir localização' : 'Abrir ajustes'}
        variant="secondary"
        onPress={() => (canAskAgain ? retry() : Linking.openSettings())}
      />
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
