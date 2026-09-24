import { authClient } from '@/lib/auth-client'
import { env } from '@/lib/env'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Fetch used by the Orval-generated hooks: prefixes the API URL, sends the session
 * cookie kept by Better Auth and throws ApiError on non-2xx responses.
 */
export async function fetcher<T>(url: string, init: RequestInit = {}): Promise<T> {
  const cookie = await authClient.getCookie()

  const response = await fetch(`${env.apiUrl}${url}`, {
    ...init,
    credentials: 'omit',
    headers: {
      ...init.headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? response.statusText)
  }

  return body as T
}

export type ErrorType<Error> = Error
export type BodyType<BodyData> = BodyData
