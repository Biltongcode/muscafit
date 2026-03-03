export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth (NextAuth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /icons, etc.
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
