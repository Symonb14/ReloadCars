import { useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session'

import { useRouter } from 'expo-router'

import * as SecureStore from 'expo-secure-store'

import { api } from '../src/lib/api'
import NlwLogo from '../src/assets/nlw-spacetime-logo.svg'

const discovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  revocationEndpoint:
    'https://github.com/settings/connections/applications/9055102200003652ce4a',
}

export default function App() {
  const router = useRouter()

  const [, response, signInGithub] = useAuthRequest(
    {
      clientId: '9055102200003652ce4a',
      scopes: ['identity'],
      redirectUri: makeRedirectUri({
        scheme: 'nlwspacetime',
      }),
    },
    discovery,
  )

  async function handleGithubOAuthCode(code: string) {
    const response = await api.post('/register', {
      code,
    })
    const { token } = response.data

    await SecureStore.setItemAsync('token', token)

    router.push('/startReload')
  }

  // useEffect(() => {
  //   console.log(
  //     makeRedirectUri({
  //       scheme: 'nlwspacetime',
  //     }),
  //   )
  // })

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params
      handleGithubOAuthCode(code)
    }
  }, [response])

  return (
    <View className="flex-1 items-center px-8 py-10">
      <View className="flex-1 items-center justify-center gap-6">
        <NlwLogo />

        <View className="space-y-2">
          <Text className="leding-tight text-center font-title text-2xl text-gray-50">
            Sua recarga segura
          </Text>
          <Text className="text-center font-body text-base leading-relaxed text-gray-100">
            Seja Bem-vindo!
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          className="rounded-full bg-green-500 px-5 py-2"
          onPress={() => signInGithub()}
        >
          <Text className="font-alt text-sm uppercase text-black">
            Começar sua regarga!
          </Text>
        </TouchableOpacity>
      </View>

      {/* <Text className="text-center font-body text-sm leading-relaxed text-gray-200">
        Feito com 💜 no NLW da Rocketseat
      </Text> */}
    </View>
  )
}
