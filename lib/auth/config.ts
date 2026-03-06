import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth configuration
 * This file should NOT import Prisma or any Node.js-only modules
 * as it's used by the middleware (Edge Runtime)
 */
export const authConfig: NextAuthConfig = {
  // Providers are configured in auth.ts (not here for Edge compatibility)
  providers: [],

  // Use JWT sessions (required for Credentials provider)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  // Callbacks - these run in Edge runtime for middleware
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token on first sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith('/auth');

      // If on auth page and logged in, redirect to home
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl));
      }

      // If not on auth page and not logged in, redirect to login
      if (!isAuthPage && !isLoggedIn) {
        const callbackUrl = encodeURIComponent(nextUrl.pathname);
        return Response.redirect(
          new URL(`/auth/login?callbackUrl=${callbackUrl}&message=Please log in to access your todos`, nextUrl)
        );
      }

      return true;
    },
  },

  // Trust host in development
  trustHost: true,
};

export default authConfig;
