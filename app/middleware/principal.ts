// Route gate for principal-only pages. Opt in with:
//   definePageMeta({ middleware: ['principal'] })
// If the user is logged in but lacks the principal role, bounce them home
// rather than to login (login would just loop back).
export default defineNuxtRouteMiddleware(() => {
  const { user, isLoggedIn } = useAuth()
  if (!isLoggedIn.value) return navigateTo('/auth/login')
  if (!user.value?.roles.includes('principal')) {
    return navigateTo('/')
  }
})
