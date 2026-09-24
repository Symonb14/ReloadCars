import Feather from '@expo/vector-icons/Feather'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

/** Title with the green round back button used across the app. */
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter()

  return (
    <View className="mb-6 flex-row items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => router.back()}
        className="size-10 items-center justify-center rounded-full bg-brand active:bg-brand-pressed"
      >
        <Feather name="arrow-left" size={20} color="#111827" />
      </Pressable>
      <Text className="flex-1 text-2xl font-bold text-ink" numberOfLines={1}>
        {title}
      </Text>
    </View>
  )
}
