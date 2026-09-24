import Feather from '@expo/vector-icons/Feather'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'
import { Button } from '@/components/button'
import { Screen } from '@/components/screen'
import { formatChargeTime, formatEnergy, formatMoney } from '@/lib/format'

/** Report shown right after saving a reload (RF06), as in the MVP. */
export default function ReloadSummaryScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    name: string
    durationMinutes: string
    energyKwh: string
    energyEstimated: string
    totalCents?: string
  }>()

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-8">
        <Image
          source={require('@/assets/images/car.png')}
          style={{ width: 260, height: 170 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />

        <View className="items-center gap-1">
          <Text className="text-2xl font-bold text-ink">Recarga registrada!</Text>
          <Text className="text-center text-base text-muted">{params.name}</Text>
        </View>

        <View className="flex-row gap-3">
          <Stat
            icon="battery-charging"
            value={formatEnergy(Number(params.energyKwh))}
            label={params.energyEstimated === 'true' ? 'estimada' : 'energia'}
          />
          <Stat
            icon="clock"
            value={formatChargeTime(Number(params.durationMinutes))}
            label="tempo"
          />
          <Stat
            icon="dollar-sign"
            value={params.totalCents ? formatMoney(Number(params.totalCents)) : '—'}
            label={params.totalCents ? 'valor' : 'sem preço'}
          />
        </View>

        <Button
          title="Concluído"
          className="self-stretch"
          onPress={() => router.dismissTo('/')}
        />
      </View>
    </Screen>
  )
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: ComponentProps<typeof Feather>['name']
  value: string
  label: string
}) {
  return (
    <View className="size-28 items-center justify-center gap-1 rounded-full bg-field">
      <Feather name={icon} size={22} color="#16a34a" />
      <Text className="text-center text-sm font-bold text-ink" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  )
}
