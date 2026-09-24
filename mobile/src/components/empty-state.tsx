import { Image } from 'expo-image'
import { Text, View } from 'react-native'

type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-4">
      <Image
        source={require('@/assets/images/car.png')}
        style={{ width: 240, height: 160 }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      <Text className="text-center text-lg font-bold text-ink">{title}</Text>
      <Text className="text-center text-base text-muted">{description}</Text>
    </View>
  )
}
