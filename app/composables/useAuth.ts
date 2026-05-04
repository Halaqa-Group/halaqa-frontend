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
  const activeRole = useState<string | null>('auth_active_role', () => null)
  const isLoggedIn = computed(() => !!token.value)
  const activeRoleStorageKey = computed(() => {
    const userId = user.value?.id
    return userId ? `auth_active_role_${userId}` : null
  })

  watch(user, (nextUser) => {
    if (!nextUser) {
      activeRole.value = null
      return
    }

    const fallbackRole = nextUser.roles[0] ?? null
    const canUseStorage = import.meta.client && !!activeRoleStorageKey.value
    const storedRole = canUseStorage ? localStorage.getItem(activeRoleStorageKey.value!) : null
    const validStoredRole = storedRole && nextUser.roles.includes(storedRole) ? storedRole : null

    if (validStoredRole) {
      activeRole.value = validStoredRole
      return
    }

    if (!activeRole.value || !nextUser.roles.includes(activeRole.value)) {
      activeRole.value = fallbackRole
    }

    if (canUseStorage && activeRole.value) {
      localStorage.setItem(activeRoleStorageKey.value!, activeRole.value)
    }
  }, { immediate: true })

  watch(activeRole, (role) => {
    if (!import.meta.client || !role || !activeRoleStorageKey.value) return
    localStorage.setItem(activeRoleStorageKey.value, role)
  })

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
    if (import.meta.client && activeRoleStorageKey.value) {
      localStorage.removeItem(activeRoleStorageKey.value)
    }
    user.value = null
    activeRole.value = null
    return navigateTo('/auth/login')
  }

  return { token, user, activeRole, isLoggedIn, login, fetchMe, logout }
}
