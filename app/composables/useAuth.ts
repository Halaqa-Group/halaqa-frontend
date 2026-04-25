export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'teacher' | 'parent' | 'admin'
  school_id?: number
  school_name?: string | null
}

// Decode JWT token to extract user data
function decodeJWT(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    const payload = JSON.parse(jsonPayload)

    // Extract user data from JWT payload
    return {
      id: payload.sub || payload.id,
      name: payload.name || payload.email,
      email: payload.email,
      role: payload.role,
      school_id: payload.school_id,
      school_name: payload.school_name ?? null
    }
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

export function useAuth() {
  const api = useApi()
  const token = useCookie<string | null>('auth_token', { maxAge: 60 * 60 * 24 * 7 })
  const user = useState<AuthUser | null>('auth_user', () => {
    // Initialize user from token if available
    if (token.value) {
      return decodeJWT(token.value)
    }
    return null
  })
  const isLoggedIn = computed(() => !!token.value)

  // Watch for token changes and update user
  watch(token, (newToken) => {
    if (newToken) {
      user.value = decodeJWT(newToken)
    } else {
      user.value = null
    }
  })

  async function login(email: string, password: string) {
    // The login response already includes school_id — no secondary calls needed.
    const data = await api<{ access_token: string, user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    token.value = data.access_token
    user.value = data.user
  }

  function logout() {
    token.value = null
    user.value = null
    return navigateTo('/auth/login')
  }

  return { token, user, isLoggedIn, login, logout }
}
