import { FlatList, Pressable, Text, View } from 'react-native'
import type { GetTrip200ChargePointsItem } from '@/api/generated/models'
import { formatDistance } from '@/lib/format'
import { pointColor } from './colors'

type PointsAlongRouteProps = {
  points: GetTrip200ChargePointsItem[]
  onSelect: (point: GetTrip200ChargePointsItem) => void
}

/** Where a point sits on the trip, e.g. "A 14,3 km do início · 110 m da rota". */
export function describeRoutePosition(point: GetTrip200ChargePointsItem) {
  return `A ${formatDistance(point.distanceAlongRouteMeters)} do início · ${formatDistance(point.distanceFromRouteMeters)} da rota`
}

/** Horizontal list of the charge points along the trip, in driving order (RF07). */
export function PointsAlongRoute({ points, onSelect }: PointsAlongRouteProps) {
  if (points.length === 0) {
    return (
      <Text className="text-sm text-muted">
        Nenhum ponto de recarga a até 2 km do caminho.
      </Text>
    )
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink">
        {points.length === 1
          ? '1 ponto de recarga no caminho'
          : `${points.length} pontos de recarga no caminho`}
      </Text>
      <FlatList
        horizontal
        data={points}
        keyExtractor={(point) => point.id}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelect(item)}
            className="w-56 gap-1 rounded-xl bg-surface p-3 active:opacity-70"
          >
            <View className="flex-row items-center gap-2">
              <View
                className="size-2.5 rounded-full"
                style={{ backgroundColor: pointColor(item.source) }}
              />
              <Text className="flex-1 font-semibold text-ink" numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Text className="text-xs text-muted" numberOfLines={2}>
              {describeRoutePosition(item)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  )
}
