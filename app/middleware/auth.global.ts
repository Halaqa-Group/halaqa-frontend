const PUBLIC_ROUTES = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password'
])

export default defineNuxtRouteMiddleware(async (to) => {
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

  const isParentRoute = to.path === '/parent'
    || to.path.startsWith('/parent/')
    || to.path === '/recite'
  if (activeRole.value === 'parent' && !isParentRoute) {
    return navigateTo('/parent')
  }

  if (activeRole.value !== 'parent' && (to.path === '/parent' || to.path.startsWith('/parent/'))) {
    return navigateTo('/')
  }
})
