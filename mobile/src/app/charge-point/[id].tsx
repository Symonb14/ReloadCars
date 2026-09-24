import Feather from '@expo/vector-icons/Feather'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { useGetChargePoint } from '@/api/generated/charge-points/charge-points'
import { Button } from '@/components/button'
import { FormError } from '@/components/form-error'
import { formatDistance, formatPower, formatPricePerKwh } from '@/lib/format'
import { chooseNavigationApp } from '@/lib/navigation-apps'
import { useRouteDestination } from '@/stores/route-destination'

export default function ChargePointSheet() {
  const router = useRouter()
  const { id, distanceMeters } = useLocalSearchParams<{
    id: string
    distanceMeters?: string
  }>()
  const point = useGetChargePoint(id)
  const setDestination = useRouteDestination((state) => state.setDestination)

  if (point.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-8">
        <ActivityIndicator color="#22c55e" />
      </View>
    )
  }

  if (point.isError) {
    return (
      <View className="flex-1 gap-4 bg-white p-6">
        <FormError message="Não foi possível carregar este ponto de recarga." />
        <Button title="Tentar novamente" onPress={() => point.refetch()} />
      </View>
    )
  }

  const data = point.data
  const isPartner = data.source === 'partner'
  const destination = {
    id: data.id,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-5 p-6">
      <View className="gap-1">
        <View
          className={`self-start rounded-full px-3 py-1 ${isPartner ? 'bg-brand/15' : 'bg-field'}`}
        >
          <Text
            className={`text-xs font-semibold ${isPartner ? 'text-brand-pressed' : 'text-muted'}`}
          >
            {isPartner ? 'Parceiro ReloadCars' : 'Ponto público'}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-ink">{data.name}</Text>
        {data.address ? (
          <Text className="text-base text-muted">{data.address}</Text>
        ) : null}
        {distanceMeters ? (
          <Text className="text-sm font-semibold text-brand-pressed">
            A {formatDistance(Number(distanceMeters))} em linha reta
          </Text>
        ) : null}
      </View>

      <View className="gap-3">
        {data.powerKw != null ? (
          <Info icon="zap" label="Potência" value={formatPower(data.powerKw)} />
        ) : null}
        <Info
          icon="dollar-sign"
          label="Preço"
          value={
            data.pricePerKwhCents != null
              ? formatPricePerKwh(data.pricePerKwhCents)
              : 'Consulte no local'
          }
        />
        {data.connectors.length > 0 ? (
          <Info icon="link" label="Conectores" value={data.connectors.join(', ')} />
        ) : null}
        {data.openingHours ? (
          <Info icon="clock" label="Funcionamento" value={data.openingHours} />
        ) : null}
      </View>

      {data.description ? (
        <Text className="text-sm leading-5 text-muted">{data.description}</Text>
      ) : null}

      <View className="gap-3">
        <Button
          title="Ver rota"
          onPress={() => {
            setDestination(destination)
            router.back()
          }}
        />
        <Button
          title="Como chegar"
          variant="secondary"
          onPress={() => chooseNavigationApp(destination)}
        />
      </View>

      {data.attribution ? (
        <Text className="text-center text-xs text-muted">{data.attribution}</Text>
      ) : null}
    </ScrollView>
  )
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Feather>['name']
  label: string
  value: string
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-9 items-center justify-center rounded-full bg-surface">
        <Feather name={icon} size={16} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-xs uppercase text-muted">{label}</Text>
        <Text className="text-base text-ink">{value}</Text>
      </View>
    </View>
  )
}
