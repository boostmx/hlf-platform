// NextAuth cookies config for cross-subdomain SSO across the HLF suite.
// In production, session + callback cookies are scoped to the apex domain so
// a sign-in on any HLF app authenticates the user on all of them. CSRF stays
// host-scoped on purpose. In dev (http://localhost:*), this returns undefined
// and NextAuth falls back to its host-only defaults.

const SHARED_COOKIE_DOMAIN = ".hlfinancialstrategies.com";

export function sharedCookieConfig() {
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
  if (!useSecureCookies) return undefined;

  return {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: true,
        domain: SHARED_COOKIE_DOMAIN,
      },
    },
    callbackUrl: {
      name: "__Secure-next-auth.callback-url",
      options: {
        sameSite: "lax" as const,
        path: "/",
        secure: true,
        domain: SHARED_COOKIE_DOMAIN,
      },
    },
  };
}
