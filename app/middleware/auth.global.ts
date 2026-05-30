const PUBLIC_ROUTES = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password'
])

export default defineNuxtRouteMiddleware(async (to) => {
  // Dev sandbox routes (mushaf renderer playground etc.) — no auth required,
  // and no redirect away if you happen to be logged in.
  if (to.path.startsWith('/dev/')) return

  const token = useCookie('auth_token')
  const isPublic = PUBLIC_ROUTES.has(to.path)
  const { user, activeRole, fetchMe } = useAuth()

  if (!token.value && !isPublic) {
    return navigateTo('/auth/login')
  }

  if (token.value && isPublic) {
    return navigateTo('/')
  }

  if (!token.value) return

  if (!user.value) {
    await fetchMe()
  }

  // Parents can additionally view today's recitation in read-only mode — the
  // /recite page enforces the read-only contract via its own role check.
  const PARENT_EXTRA = new Set(['/parent', '/recite'])
  if (activeRole.value === 'parent' && !PARENT_EXTRA.has(to.path)) {
    return navigateTo('/parent')
  }

  if (activeRole.value !== 'parent' && to.path === '/parent') {
    return navigateTo('/')
  }
})
