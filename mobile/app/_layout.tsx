import { styled } from 'nativewind'
import { View } from 'react-native'
import Stripes from '../src/assets/stripes.svg'
import * as SecureStore from 'expo-secure-store'

import { BaiJamjuree_700Bold } from '@expo-google-fonts/bai-jamjuree'
import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'

const StyledStripes = styled(Stripes)

export default function Layout() {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<
    null | boolean
  >(null)

  const [hasLoadedFonts] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
    BaiJamjuree_700Bold,
  })

  useEffect(() => {
    SecureStore.getItemAsync('token').then((token) => {
      setIsUserAuthenticated(!!token)
    })
  })

  if (!hasLoadedFonts) {
    return <SplashScreen />
  }

  return (
    <View className="relative flex-1 bg-white">
      <StyledStripes className="absolute left-2" />
      <StatusBar style="dark" translucent />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" redirect={isUserAuthenticated} />
        <Stack.Screen name="memories" />
        <Stack.Screen name="reload" />
        <Stack.Screen name="startReload" />
        <Stack.Screen name="new" />
      </Stack>
    </View>
  )
}
