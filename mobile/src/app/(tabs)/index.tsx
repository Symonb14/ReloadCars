import { View } from 'react-native'
import { EmptyState } from '@/components/empty-state'
import { Logo } from '@/components/logo'
import { Screen } from '@/components/screen'

export default function ReloadsScreen() {
  return (
    <Screen>
      <View className="mb-6">
        <Logo size="sm" />
      </View>
      <EmptyState
        title="Nenhuma recarga registrada"
        description="Em breve você poderá registrar suas recargas e acompanhar tempo, energia e custo de cada uma."
      />
    </Screen>
  )
}
