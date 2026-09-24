export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Fetch used by the Orval-generated hooks. Calls go through the /backend proxy
 * (next.config.ts), so the session cookie is sent automatically.
 */
export async function fetcher<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/backend${url}`, { ...init, credentials: 'same-origin' })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? response.statusText)
  }

  return body as T
}

export type ErrorType<Error> = Error
export type BodyType<BodyData> = BodyData
