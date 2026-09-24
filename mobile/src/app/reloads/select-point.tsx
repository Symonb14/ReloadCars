import { useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'
import { useGetNearbyChargePoints } from '@/api/generated/charge-points/charge-points'
import { Button } from '@/components/button'
import { FormError } from '@/components/form-error'
import { pointColor } from '@/components/map/colors'
import { ScreenHeader } from '@/components/screen-header'
import { type Coordinates, useUserLocation } from '@/hooks/use-user-location'
import { formatDistance, formatPower, formatPricePerKwh } from '@/lib/format'
import { useReloadDraft } from '@/stores/reload-draft'

const SafeAreaView = withUniwind(RNSafeAreaView)

// Wide enough to reach Belo Horizonte from Betim.
const RADIUS_KM = 30

export default function SelectPointScreen() {
  const location = useUserLocation()

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'left', 'right']}>
      <View className="px-8 pt-6">
        <ScreenHeader title="Onde você recarregou?" />
      </View>
      {location.status === 'loading' ? (
        <ActivityIndicator className="mt-8" color="#22c55e" />
      ) : (
        <PointList center={location.coords} />
      )}
    </SafeAreaView>
  )
}

function PointList({ center }: { center: Coordinates }) {
  const router = useRouter()
  const setChargePoint = useReloadDraft((state) => state.setChargePoint)
  const nearby = useGetNearbyChargePoints({
    lat: center.latitude,
    lng: center.longitude,
    radiusKm: RADIUS_KM,
  })

  if (nearby.isPending) return <ActivityIndicator className="mt-8" color="#22c55e" />

  if (nearby.isError) {
    return (
      <View className="gap-4 px-8">
        <FormError message="Não foi possível carregar os pontos." />
        <Button title="Tentar novamente" onPress={() => nearby.refetch()} />
      </View>
    )
  }

  return (
    <FlatList
      data={nearby.data.chargePoints}
      keyExtractor={(point) => point.id}
      contentContainerClassName="gap-2 px-8 pb-8"
      ListEmptyComponent={
        <Text className="text-center text-muted">
          Nenhum ponto de recarga num raio de {RADIUS_KM} km.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setChargePoint(item)
            router.back()
          }}
          className="gap-1 rounded-xl bg-white p-4 active:opacity-70"
        >
          <View className="flex-row items-center gap-2">
            <View
              className="size-2.5 rounded-full"
              style={{ backgroundColor: pointColor(item.source) }}
            />
            <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-sm text-muted">
              {formatDistance(item.distanceMeters)}
            </Text>
          </View>
          {item.address ? (
            <Text className="text-sm text-muted" numberOfLines={1}>
              {item.address}
            </Text>
          ) : null}
          <Text className="text-xs text-muted">
            {[
              item.powerKw != null ? formatPower(item.powerKw) : null,
              item.pricePerKwhCents != null
                ? formatPricePerKwh(item.pricePerKwhCents)
                : 'Preço não informado',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Pressable>
      )}
    />
  )
}
