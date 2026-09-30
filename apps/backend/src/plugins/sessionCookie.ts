// The platform proxy terminates TLS, so the process often sees HTTP.
// `secure: true` makes @fastify/session drop the cookie in that case, and login
// then fails CSRF. `auto` keeps SameSite=None; Secure when the forwarded
// protocol is https, and still stores a SameSite=Lax cookie otherwise.
export function sessionCookie(nodeEnv: string) {
  const production = nodeEnv === 'production';
  return {
    httpOnly: true,
    sameSite: production ? ('none' as const) : ('lax' as const),
    secure: production ? ('auto' as const) : false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
