import type { CookieRef } from '#app'

// Kept >= the backend's JWT_REFRESH_TTL_DAYS (30) so the access cookie never
// expires before the session it belongs to. It is not what grants the session:
// the HttpOnly `refresh_token` cookie is, and it carries 30 days only when the
// user ticked "remember me" (1 day otherwise). A leftover access token past
// that point just 401s on first use and bounces to /auth/login.
const AUTH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30

/**
 * The one and only handle on the `auth_token` cookie.
 *
 * Every caller must build the cookie with identical options — `useCookie` knows
 * only what it was handed, so a write through a ref created without `maxAge`
 * silently downgrades a persistent cookie into a session one. That is what used
 * to break "remember me": the first silent token refresh (15 minutes in)
 * rewrote the cookie with no Expires, so the session died on browser close.
 *
 * The ref is cached on the Nuxt app so the API client, `useAuth`, and the route
 * middleware share one reactive value instead of three snapshots that drift
 * apart after a refresh.
 */
export function useAuthToken(): CookieRef<string | null> {
  const nuxt = useNuxtApp() as unknown as { _authTokenCookie?: CookieRef<string | null> }
  nuxt._authTokenCookie ??= useCookie<string | null>('auth_token', {
    path: '/',
    sameSite: 'lax',
    maxAge: AUTH_TOKEN_MAX_AGE
  })
  return nuxt._authTokenCookie
}
