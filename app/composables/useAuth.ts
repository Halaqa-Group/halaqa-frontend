export interface AuthUser {
  id: number
  name: string
  email: string
  phone?: string | null
  roles: string[]
}

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export function useAuth() {
  const api = useApi()
  const token = useCookie<string | null>('auth_token', { maxAge: 60 * 60 * 24 * 7 })
  const user = useState<AuthUser | null>('auth_user', () => null)
  const isLoggedIn = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const data = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    token.value = data.accessToken
    user.value = data.user
  }

  async function fetchMe(): Promise<boolean> {
    try {
      user.value = await api<AuthUser>('/auth/me')
      return true
    } catch {
      token.value = null
      user.value = null
      return false
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Best-effort: clear local state regardless of server outcome.
    }
    token.value = null
    user.value = null
    return navigateTo('/auth/login')
  }

  return { token, user, isLoggedIn, login, fetchMe, logout }
}
