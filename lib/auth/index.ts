import { auth } from './nextauth';
import { redirect } from 'next/navigation';

// Re-export only client-safe utilities
// Server-only code (password, rate-limit, ip-address) should be imported directly
export * from './password-policy';

/**
 * Get the current session (for use in Server Components and Server Actions)
 * @returns Session object or null
 */
export async function getSession() {
  return await auth();
}

/**
 * Get the current authenticated user
 * @returns User object or null
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Require authentication - throws redirect if not authenticated
 * Use in Server Components and Server Actions that require auth
 * @returns User object
 * @throws Redirects to login page if not authenticated
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login?message=Please log in to continue');
  }

  return session.user;
}

/**
 * Get user ID from session
 * @returns User ID or null
 */
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Check if current user is authenticated
 * @returns True if authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}
