export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login, /register
     * - /api/auth (NextAuth routes)
     * - /api/connections/invite/:token (invite validation - unauthenticated)
     * - /_next (Next.js internals)
     * - /favicon.ico, /icons, etc.
     */
    '/((?!login|register|api/auth|api/connections/invite/[^/]+$|_next/static|_next/image|favicon.ico|avatars).*)',
  ],
};
