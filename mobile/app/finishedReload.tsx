import { useState } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'

import { useRouter } from 'expo-router'

import Icon from '@expo/vector-icons/Feather'

import Car from '../src/assets/car.png'

export default function App() {
  const router = useRouter()
  const [time] = useState('')

  async function handleCreateReload() {
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

    router.push('memories')
  }

  return (
    <View className="flex-1 items-center px-8 py-10">
      <View className="flex-1 items-center justify-center gap-6">
        <Image source={Car} alt="" />

        <View className="mt-4 flex-row items-center justify-between gap-3">
          <View className="h-24 w-24 items-center rounded-full bg-gray-300">
            <Icon
              name="battery-charging"
              size={24}
              color="#bebebf"
              style={{ marginTop: 12 }}
            />
            <Text className="leding-tight text-center font-title text-lg text-gray-50">
              0 vw
            </Text>
          </View>
          <View className="h-24 w-24 items-center rounded-full bg-gray-300">
            <Icon
              name="clock"
              size={24}
              color="#bebebf"
              style={{ marginTop: 12 }}
            />
            <Text className="leding-tight text-center font-title text-lg text-gray-50">
              {time}
            </Text>
          </View>
          <View className="h-24 w-24 items-center rounded-full bg-gray-300">
            <Icon
              name="dollar-sign"
              size={24}
              color="#bebebf"
              style={{ marginTop: 12 }}
            />
            <Text className="leding-tight text-center font-title text-lg text-gray-50">
              0.0
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          className="rounded-full bg-green-500 px-5 py-2"
          onPress={() => handleCreateReload()}
        >
          <Text className="font-alt text-sm uppercase text-black">
            Concluido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
