import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native'

import { useRouter } from 'expo-router'
import Car from '../src/assets/car.png'
import carLogo from '../src/assets/reload-logo.png'

import * as SecureStore from 'expo-secure-store'
import { api } from '../src/lib/api'

export default function StartReload() {
  const router = useRouter()
  const [time, setTime] = useState('')

  async function handleStartReload() {
    const token = await SecureStore.getItemAsync('token')

    await api.post(
      '/reload',
      {
        time,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    router.push('finishedReload')
  }

  // async function calculatedReload(time: string) {
  //   const tarifa = 0.5
  //   const tanque = 50.0

  //   return parseFloat(time) * tarifa * tanque
  // }

  return (
    <View className="flex-1 items-center px-8 py-10">
      <Image source={carLogo} alt="logo" style={{ width: 114, height: 65 }} />
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
