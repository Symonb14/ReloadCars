import { Text, TouchableOpacity, View, ScrollView, Image } from 'react-native'
import carLogo from '../src/assets/reload-logo.png'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function NewMemory() {
  const { bottom, top } = useSafeAreaInsets()

  return (
    <ScrollView
      className="flex-1 px-8"
      contentContainerStyle={{ paddingBottom: bottom, paddingTop: top }}
    >
      <View className="mt-4 flex-row items-center justify-between">
        <Image source={carLogo} alt="logo" style={{ width: 114, height: 65 }} />
      </View>

      <View className="mt-16 space-y-8">
        <Text className="font-alt text-sm uppercase text-black">
          Solicitação enviada com sucesso! O time responsável irá verificar suas
          informações e você receberá um e-mail confirmando sua participação
          como um dos nossos parceiros válidos.
        </Text>

        <Link href="/" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="items-center justify-center rounded-full bg-green-500 px-5 py-2"
          >
            <Text className="font-alt text-sm uppercase text-black">OK!</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  )
}
