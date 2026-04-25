export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token')
  const { user } = useAuth()

  // Redirect to login if no token
  if (!token.value && to.path !== '/auth/login') {
    return navigateTo('/auth/login')
  }

  // Redirect to dashboard if already logged in
  if (token.value && to.path === '/auth/login') {
    return navigateTo('/')
  }
})
