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

  const token = useAuthToken()
  const isPublic = PUBLIC_ROUTES.has(to.path)
  const { user, activeRole, fetchMe } = useAuth()
  // When offline we cannot refresh the token or re-fetch the profile; lean on the
  // cached identity instead of ejecting the user to a login page they can't use.
  const online = !import.meta.client || navigator.onLine

  // Deliberately no fetchMe() here: a stale cookie would 401, and the API layer
  // answers a failed refresh by bouncing to /auth/login — which would throw away
  // the token in the URL before the page ever got to spend it. The page hydrates
  // the profile itself once verification has gone through.
  if (UNGATED_ROUTES.has(to.path)) return

  // The access token only lives 15 minutes and can be dropped by the browser
  // long before the session ends; the HttpOnly refresh cookie is what actually
  // holds a remembered login (30 days). Spend it before writing the user off —
  // without this, a cleared access cookie logs out someone who ticked
  // "remember me". Only on guarded routes, so the login page doesn't fire a
  // doomed refresh on every visit.
  if (!token.value && !isPublic && online) {
    await useApi().refresh()
  }

  if (!token.value && !isPublic) {
    return navigateTo('/auth/login')
  }

  if (token.value && isPublic) {
    return navigateTo('/')
  }

  if (!token.value) return

  if (!user.value) {
    // Offline with no cached profile: let the page render read-only rather than
    // firing a doomed /auth/me. Role redirects below are skipped until we know
    // the roles.
    if (!online) return
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
