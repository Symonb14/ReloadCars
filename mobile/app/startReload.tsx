import { useState } from 'react'
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native'

import { useRouter } from 'expo-router'

import Car from '../src/assets/car.png'
import carLogo from '../src/assets/reload-logo.png'

export default function App() {
  const router = useRouter()
  const [time, setTime] = useState('')

  async function handleStartReload() {
    // const token = await SecureStore.getItemAsync('token')

    // const coverUrl = 'testando'

    // await api.post(
    //   '/memories',
    //   {
    //     content,
    //     isPublic,
    //     coverUrl,
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //     },
    //   },
    // )

    router.push('finishedReload')
  }

  return (
    <View className="flex-1 items-center px-8 py-10">
      <Image source={carLogo} style={{ width: 114, height: 65 }} alt="" />
      <View className="flex-1 items-center justify-center gap-6">
        <Image source={Car} alt="" />

        <TextInput
          value={time}
          onChangeText={setTime}
          className="h-14 w-44 rounded-lg border-gray-100 bg-gray-300 px-4 text-base focus:border-gray-600 focus:bg-gray-300"
          placeholder="Tempo de recarga"
          placeholderTextColor="#bebebf"
        />

        <TouchableOpacity
          activeOpacity={0.7}
          className="rounded-full bg-green-500 px-5 py-2"
          onPress={() => handleStartReload()}
        >
          <Text className="font-alt text-sm uppercase text-black">Começar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
