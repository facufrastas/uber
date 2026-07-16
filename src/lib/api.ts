import { useAuthStore, type Tokens } from '@/stores/authStore'

// fetch client for FresaStuff-API. Auth is JWT only: Authorization: Bearer
// on every request, transparent renewal via /fleet/auth/refresh when the
// access token expires (1h), and session cleanup when the refresh token (7d)
// is no longer valid — RequireAuth then redirects to /login.

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'https://api.frastas.com'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function messageFrom(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string }
    if (body.message) return body.message
  } catch {
    // non-JSON body: fall through to the status text
  }
  return `${res.status} ${res.statusText}`
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/fleet/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new ApiError(res.status, await messageFrom(res))
  useAuthStore.getState().setTokens((await res.json()) as Tokens)
}

// Single in-flight refresh: parallel 401s (loadAll fires 7 requests) share it
// instead of burning the rate limit with duplicate refresh calls.
let refreshing: Promise<boolean> | null = null

function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const { refreshToken } = useAuthStore.getState()
      if (!refreshToken) return false
      const res = await fetch(`${API_URL}/fleet/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken }),
      })
      if (!res.ok) return false
      useAuthStore.getState().setTokens((await res.json()) as Tokens)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const { accessToken } = useAuthStore.getState()
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init)

  if (res.status === 401 || res.status === 403) {
    if (await refreshTokens()) {
      res = await doFetch(path, init)
    } else {
      useAuthStore.getState().clear()
      throw new ApiError(res.status, 'Sesión expirada')
    }
  }

  if (!res.ok) throw new ApiError(res.status, await messageFrom(res))

  return (await res.json()) as T
}
