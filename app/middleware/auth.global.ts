export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token')
  const { user } = useAuth()

  // Redirect to login if no token
  if (!token.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  // Redirect to dashboard if already logged in
  if (token.value && to.path === '/login') {
    return navigateTo('/')
  }

  // Log user state for debugging
  if (import.meta.client && token.value) {
    console.log('Auth middleware - User state:', user.value)
  }
})
