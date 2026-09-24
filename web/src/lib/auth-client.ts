import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Better Auth lives in the API; requests go through the /backend proxy
// (e.g. /backend/api/auth/sign-in/email → API /api/auth/sign-in/email).
// The full auth path is required: when baseURL already has a path, Better Auth uses it
// as-is instead of appending /api/auth.
export const authClient = createAuthClient({
  baseURL: `${appUrl}/backend/api/auth`,
  plugins: [
    inferAdditionalFields({
      user: { role: { type: 'string', input: false } },
    }),
  ],
})
