const PUBLIC_ROUTES = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password'
])

// Reachable in either state — an emailed verification link is opened both by
// signed-in users and by people whose session lives in another browser.
const UNGATED_ROUTES = new Set([
  '/auth/verify-email'
])

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/dev/')) return

  const token = useCookie('auth_token')
  const isPublic = PUBLIC_ROUTES.has(to.path)
  const { user, activeRole, fetchMe } = useAuth()

  // Deliberately no fetchMe() here: a stale cookie would 401, and the API layer
  // answers a failed refresh by bouncing to /auth/login — which would throw away
  // the token in the URL before the page ever got to spend it. The page hydrates
  // the profile itself once verification has gone through.
  if (UNGATED_ROUTES.has(to.path)) return

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
