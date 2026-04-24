export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'teacher' | 'parent' | 'admin'
  school_id?: number
}

export function useAuth() {
  const api = useApi()
  const token = useCookie<string | null>('auth_token', { maxAge: 60 * 60 * 24 * 7 })
  const user = useState<AuthUser | null>('auth_user', () => null)
  const isLoggedIn = computed(() => !!token.value)

  async function login(email: string, password: string) {
    // The login response already includes school_id — no secondary calls needed.
    const data = await api<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    token.value = data.access_token
    user.value = data.user
  }

  function logout() {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, isLoggedIn, login, logout }
}
