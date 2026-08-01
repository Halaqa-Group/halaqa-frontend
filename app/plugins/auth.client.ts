export default defineNuxtPlugin(async () => {
  const { token, user, fetchMe } = useAuth()
  // `user` may already be hydrated from the offline cache. Only reach for the
  // network profile when we actually need it and can actually reach it.
  if (token.value && !user.value && navigator.onLine) {
    await fetchMe()
  }
})
