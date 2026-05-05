// Hydrates the auth user on app boot. If a token cookie survived a refresh,
// we validate it via /auth/me and populate user state; on failure the cookie
// is cleared and the route middleware bounces the visitor to /auth/login.
export default defineNuxtPlugin(async () => {
  const { token, user, fetchMe } = useAuth()
  if (token.value && !user.value) {
    await fetchMe()
  }
})
