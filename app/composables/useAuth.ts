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
    const data = await api<{ access_token: string; user: Pick<AuthUser, 'id' | 'name' | 'email' | 'role'> }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    token.value = data.access_token
    user.value = data.user as AuthUser

    if (data.user.role === 'teacher') {
      try {
        const teacher = await api<{ school_id: number }>(`/teachers/${data.user.id}`)
        user.value = { ...data.user, school_id: teacher.school_id }
      }
      catch { /* school_id not critical for UI to start */ }
    }
    else if (data.user.role === 'admin') {
      try {
        const admin = await api<{ school_id: number }>(`/admins/${data.user.id}`)
        user.value = { ...data.user, school_id: admin.school_id }
      }
      catch { /* ignore */ }
    }
  }

  function logout() {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, isLoggedIn, login, logout }
}
