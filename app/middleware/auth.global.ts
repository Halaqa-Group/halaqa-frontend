const PUBLIC_ROUTES = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password'
])

export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token')
  const isPublic = PUBLIC_ROUTES.has(to.path)

  if (!token.value && !isPublic) {
    return navigateTo('/auth/login')
  }

  if (token.value && isPublic) {
    return navigateTo('/')
  }
})
