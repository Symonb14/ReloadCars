import {
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
  Image,
} from 'react-native'
import carLogo from '../src/assets/reload-logo.png'
import { Link, useRouter } from 'expo-router'
import Icon from '@expo/vector-icons/Feather'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { api } from '../src/lib/api'
import { useState } from 'react'

export default function NewMemory() {
  const router = useRouter()
  const { bottom, top } = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  async function handleCreateClient() {
    await api.post('/client', {
      name,
      login: cnpj,
      email,
      latitude: '',
      longitude: '',
      address,
    })

    router.push('contactClient')
  }

  return (
    <ScrollView
      className="flex-1 px-8"
      contentContainerStyle={{ paddingBottom: bottom, paddingTop: top }}
    >
      <View className="mt-4 flex-row items-center justify-between">
        <Image source={carLogo} alt="logo" style={{ width: 114, height: 65 }} />
        <Link href="/" asChild>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-green-500">
            <Icon name="arrow-left" size={16} color="#FFF" />
          </TouchableOpacity>
        </Link>
      </View>

      <View className="mt-2 space-y-4">
        <Text className="font-alt text-sm uppercase text-black">Nome:</Text>
        <TextInput
          className="h-14 w-auto rounded-lg border-gray-100 bg-gray-300 px-4 text-base focus:border-gray-600 focus:bg-gray-300"
          placeholder="Digite o seu nome completo"
          placeholderTextColor="#bebebf"
          value={name}
          onChangeText={setName}
        />
        <Text className="font-alt text-sm uppercase text-black">CPNJ:</Text>
        <TextInput
          className="h-14 w-auto rounded-lg border-gray-100 bg-gray-300 px-4 text-base focus:border-gray-600 focus:bg-gray-300"
          placeholder="Digite o seu CNPJ"
          placeholderTextColor="#bebebf"
          value={cnpj}
          onChangeText={setCnpj}
          maxLength={14}
        />
        <Text className="font-alt text-sm uppercase text-black">Email:</Text>
        <TextInput
          inputMode="email"
          className="h-14 w-auto rounded-lg border-gray-100 bg-gray-300 px-4 text-base focus:border-gray-600 focus:bg-gray-300"
          placeholder="Digite o seu e-mail"
          placeholderTextColor="#bebebf"
          value={email}
          onChangeText={setEmail}
        />
        <Text className="font-alt text-sm uppercase text-black">Endereço:</Text>
        <TextInput
          className="h-14 w-auto rounded-lg border-gray-100 bg-gray-300 px-4 text-base focus:border-gray-600 focus:bg-gray-300"
          placeholder="Digite o endereço completo"
          placeholderTextColor="#bebebf"
          value={address}
          onChangeText={setAddress}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          className="items-center self-end rounded-full bg-green-500 px-5 py-2"
          onPress={handleCreateClient}
        >
          <Text className="font-alt text-sm uppercase text-black">Salvar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
