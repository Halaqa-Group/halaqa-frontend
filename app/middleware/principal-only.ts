export default defineNuxtRouteMiddleware(async () => {
  const { token, user, activeRole, fetchMe } = useAuth()

  if (!token.value) {
    return navigateTo('/auth/login')
  }

  if (!user.value) {
    const ok = await fetchMe()
    if (!ok) {
      return navigateTo('/auth/login')
    }
  }

  const roles = user.value?.roles ?? []
  const isPrincipalUser = roles.includes('principal')
  const isPrincipalActiveRole = activeRole.value === 'principal'

  if (!isPrincipalUser || !isPrincipalActiveRole) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized'
    })
  }
})
