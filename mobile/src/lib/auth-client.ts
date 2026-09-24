import { expoClient } from '@better-auth/expo/client'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import * as SecureStore from 'expo-secure-store'
import { env } from './env'

export const authClient = createAuthClient({
  baseURL: env.apiUrl,
  plugins: [
    expoClient({
      scheme: 'reloadcars',
      storagePrefix: 'reloadcars',
      storage: SecureStore,
    }),
    // Exposes the `role` field added by the server's admin plugin.
    inferAdditionalFields({
      user: { role: { type: 'string', input: false } },
    }),
  ],
})
