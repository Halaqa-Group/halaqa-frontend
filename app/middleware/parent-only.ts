export default defineNuxtRouteMiddleware(async () => {
  const { token, user, activeRole, fetchMe } = useAuth()

  if (!token.value) {
    return navigateTo('/auth/login')
  }

  if (!user.value) {
    const ok = await fetchMe()
    if (!ok) return navigateTo('/auth/login')
  }

  const isParentUser = (user.value?.roles ?? []).includes('parent')
  const isParentActiveRole = activeRole.value === 'parent'

  if (!isParentUser || !isParentActiveRole) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized'
    })
  }
})
