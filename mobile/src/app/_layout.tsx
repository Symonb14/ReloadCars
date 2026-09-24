import '../global.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/lib/query-client'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession()
  const isSignedIn = Boolean(session)

  useEffect(() => {
    if (!isPending) SplashScreen.hideAsync()
  }, [isPending])

  // Keep the splash screen until we know whether there is a session.
  if (isPending) return null

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  )
}
