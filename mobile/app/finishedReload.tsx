import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { api } from '../src/lib/api'

import { useRouter } from 'expo-router'

import Icon from '@expo/vector-icons/Feather'

import Car from '../src/assets/car.png'

interface Reload {
  time: string
  kwh: string
  value: string
  id: string
}

export default function FinishedReload() {
  const router = useRouter()
  const [reloads, setReloads] = useState<Reload[]>([])

  async function handleCreateReload() {
    const token = await SecureStore.getItemAsync('token')

    const response = await api.get('/reloads', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    console.log(response.data)
    setReloads(response.data)
  }

  useEffect(() => {
    handleCreateReload()
  }, [])

  function handleClickComplete() {
    router.push('/memories')
  }

  return (
    <View className="flex-1 items-center px-8 py-10">
      <View className="flex-1 items-center justify-center gap-6">
        <Image source={Car} alt="" />
        {reloads.map((reload, index) => {
          if (index === reloads.length - 1) {
            return (
              <View
                key={reload.id}
                className="mt-4 flex-row items-center justify-between gap-3"
              >
                <View className="h-24 w-24 items-center rounded-full bg-gray-300">
                  <Icon
                    name="battery-charging"
                    size={24}
                    color="#bebebf"
                    style={{ marginTop: 12 }}
                  />
                  <Text className="leding-tight text-center font-title text-lg text-gray-50">
                    {reload.kwh} kw
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
                    {reload.time.concat(':00')}
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
                    {reload.value}.00
                  </Text>
                </View>
              </View>
            )
          }
          return null
        })}

        <TouchableOpacity
          activeOpacity={0.7}
          className="rounded-full bg-green-500 px-5 py-2"
          onPress={() => handleClickComplete()}
        >
          <Text className="font-alt text-sm uppercase text-black">
            Concluido
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
