import { View } from 'react-native'
import { EmptyState } from '@/components/empty-state'
import { Logo } from '@/components/logo'
import { Screen } from '@/components/screen'

export default function MapScreen() {
  return (
    <Screen>
      <View className="mb-6">
        <Logo size="sm" />
      </View>
      <EmptyState
        title="Mapa em construção"
        description="Em breve você verá aqui os pontos de recarga perto de você e a rota até eles."
      />
    </Screen>
  )
}
