export default defineNuxtRouteMiddleware(() => {
  const { user, isLoggedIn } = useAuth()
  if (!isLoggedIn.value) return navigateTo('/auth/login')
  if (!user.value?.roles.includes('principal')) {
    return navigateTo('/')
  }
})
