import Feather from '@expo/vector-icons/Feather'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Button } from '@/components/button'

type RouteCardProps = {
  title: string
  name: string
  summary: string | null
  loading: boolean
  failed: boolean
  onNavigate: () => void
  onClose: () => void
  children?: ReactNode
}

/** Bottom card shown while a route is on the map (to a point or to a destination). */
export function RouteCard(props: RouteCardProps) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4 shadow-lg">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-semibold uppercase text-muted">
            {props.title}
          </Text>
          <Text className="text-lg font-bold text-ink" numberOfLines={1}>
            {props.name}
          </Text>
          {props.loading ? <Text className="text-muted">Calculando rota…</Text> : null}
          {props.failed ? (
            <Text className="text-danger">Não foi possível calcular a rota.</Text>
          ) : null}
          {props.summary && !props.loading ? (
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

      {props.children}

      <Button title="Como chegar" onPress={props.onNavigate} />
      {/* Required attribution for Mapbox data on a non-Mapbox map. */}
      <Text className="text-center text-[10px] text-muted">© Mapbox © OpenStreetMap</Text>
    </View>
  )
}
