import { Linking, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { MAP_COLORS } from './colors'

export function Legend() {
  return (
    <View className="flex-row items-center justify-center gap-4 self-center rounded-full bg-white/90 px-4 py-2">
      <LegendItem color={MAP_COLORS.partner} label="Parceiros" />
      <LegendItem color={MAP_COLORS.public} label="Pontos públicos" />
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

export function PermissionBanner({
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

export function StatusPill({
  text,
  tone = 'info',
}: {
  text: string
  tone?: 'info' | 'error'
}) {
  return (
    <View
      className={`rounded-full px-4 py-2 ${tone === 'error' ? 'bg-danger' : 'bg-white'}`}
    >
      <Text
        className={`text-sm ${tone === 'error' ? 'font-semibold text-white' : 'text-ink'}`}
      >
        {text}
      </Text>
    </View>
  )
}
