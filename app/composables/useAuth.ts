export interface AuthUser {
  id: number
  name: string
  email: string
  phone?: string | null
  photoUrl?: string | null
  roles: string[]
}

export interface UpdateMePayload {
  name?: string
  phone?: string | null
  photo_url?: string | null
}

export interface ChangePasswordPayload {
  currentPassword: string
  password: string
  password_confirmation: string
}

export interface Session {
  id: string
  deviceName: string | null
  deviceType: 'web' | 'mobile_ios' | 'mobile_android' | 'desktop' | 'other'
  ipAddress: string | null
  lastUsedAt: string | null
  issuedAt: string
  current: boolean
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

  async function login(email: string, password: string, rememberMe = false) {
    const data = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, rememberMe }
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

  async function forgotPassword(email: string) {
    await api('/auth/forgot-password', { method: 'POST', body: { email } })
  }

  async function validateResetToken(t: string): Promise<{ email: string }> {
    return api<{ email: string }>('/auth/validate-reset-token', { query: { token: t } })
  }

  async function resetPassword(t: string, password: string, password_confirmation: string) {
    await api('/auth/reset-password', {
      method: 'POST',
      body: { token: t, password, password_confirmation }
    })
  }

  async function updateMe(payload: UpdateMePayload): Promise<AuthUser> {
    // PATCH /me returns the full UserView; merge the bits we keep in state
    // so the dashboard avatar / name update without a second round-trip.
    const updated = await api<AuthUser & { photoUrl: string | null }>('/me', {
      method: 'PATCH',
      body: payload
    })
    user.value = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? null,
      photoUrl: updated.photoUrl ?? null,
      roles: updated.roles
    }
    return user.value
  }

  async function changePassword(payload: ChangePasswordPayload) {
    await api('/auth/change-password', { method: 'POST', body: payload })
  }

  async function listSessions(): Promise<Session[]> {
    return api<Session[]>('/auth/sessions')
  }

  async function revokeSession(id: string) {
    await api(`/auth/sessions/${id}`, { method: 'DELETE' })
  }

  async function logoutAll() {
    try {
      await api('/auth/logout-all', { method: 'POST' })
    } catch {
      // Best-effort; clear local state anyway.
    }
    token.value = null
    user.value = null
    return navigateTo('/auth/login')
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    fetchMe,
    logout,
    forgotPassword,
    validateResetToken,
    resetPassword,
    updateMe,
    changePassword,
    listSessions,
    revokeSession,
    logoutAll
  }
}
