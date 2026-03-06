import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config';

/**
 * Proxy for authentication (Next.js 16+)
 * Runs on Node.js runtime (not Edge)
 * Uses auth.config.ts for authorization logic
 */
const { auth } = NextAuth(authConfig);

// Export as 'proxy' - required by Next.js 16+ proxy convention
export const proxy = auth;

export const config = {
  // Match all routes except:
  // - API routes that start with /api/auth (NextAuth routes)
  // - Static files (_next, public assets)
  // - Favicon
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes - must be public)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
};
