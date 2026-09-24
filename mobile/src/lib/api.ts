import { authClient } from './auth-client'
import { env } from './env'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Calls the ReloadCars API sending the session cookie kept by Better Auth. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookie = await authClient.getCookie()

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.message ?? response.statusText)
  }

  return response.json() as Promise<T>
}
