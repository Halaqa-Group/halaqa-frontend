export default defineNuxtRouteMiddleware(async (to) => {
  const token = useCookie('auth_token')
  const { user, activeRole, fetchMe } = useAuth()

  // Redirect to login if no token
  if (!token.value && to.path !== '/auth/login') {
    return navigateTo('/auth/login')
  }

  // Redirect to dashboard if already logged in
  if (token.value && to.path === '/auth/login') {
    return navigateTo('/')
  }

  if (!token.value) return

  if (!user.value) {
    await fetchMe()
  }

  if (activeRole.value === 'parent' && to.path !== '/parent') {
    return navigateTo('/parent')
  }

  if (activeRole.value !== 'parent' && to.path === '/parent') {
    return navigateTo('/')
  }
})
