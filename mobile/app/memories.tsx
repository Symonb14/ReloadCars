import { useEffect, useState } from 'react'
import { TouchableOpacity, View, ScrollView, Text, Image } from 'react-native'
import carLogo from '../src/assets/reload-logo.png'
import Icon from '@expo/vector-icons/Feather'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { api } from '../src/lib/api'
import dayjs from 'dayjs'

interface Memory {
  time: string
  kwh: string
  value: string
  id: string
  createdAt: string
}

export default function NewMemory() {
  const { bottom, top } = useSafeAreaInsets()
  const router = useRouter()

  const [memories, setMemories] = useState<Memory[]>([])

  async function signOut() {
    await SecureStore.deleteItemAsync('token')

    router.push('/')
  }

  async function loadMemories() {
    const token = await SecureStore.getItemAsync('token')

    const response = await api.get('/reloads', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    setMemories(response.data)
  }

  useEffect(() => {
    loadMemories()
  }, [])

  function handleDetailReload(id: string) {
    const reload = api.get(`/reload:${id}`)

    router.push('/details')
    return reload
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: bottom, paddingTop: top }}
    >
      <View className="mt-4 flex-row items-center justify-between px-8">
        <Image source={carLogo} style={{ width: 114, height: 65 }} alt="" />

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={signOut}
            className="h-10 w-10 items-center justify-center rounded-full bg-red-500"
          >
            <Icon name="log-out" size={16} color="#000" />
          </TouchableOpacity>
          <Link href="/startReload" asChild>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Icon name="plus" size={16} color="#000" />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <View className="mt-6 space-y-10">
        {memories.map((memory) => {
          return (
            <View key={memory.id} className="space-y-4">
              <View className="space-y-4 px-8">
                <Text>
                  {dayjs(memory.createdAt).format('D[ de ]MMMM[, ]YYYY')}
                </Text>
                <Text>Valor da sua recarga: {memory.value}.00</Text>
                <Text className="font-body text-base leading-relaxed text-gray-100">
                  Tempo da sua recarga: {memory.time}:00
                </Text>
                <TouchableOpacity
                  onPress={() => handleDetailReload(memory.id)}
                  className="flex-row items-center gap-2"
                >
                  <Text className="font-body text-sm text-gray-200">
                    <Icon name="check-circle" size={18} color="#04d361" />
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
