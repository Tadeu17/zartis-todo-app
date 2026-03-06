import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { authConfig } from './config';
import { verifyPassword } from '@/lib/auth/password';
import { getIpAddress } from '@/lib/auth/ip-address';
import {
  checkRateLimit,
  recordLoginAttempt,
  clearLoginAttempts,
} from '@/lib/auth/rate-limit';

/**
 * Custom error class for rate limiting
 */
class RateLimitError extends CredentialsSignin {
  constructor(message: string) {
    super();
    this.message = message;
    this.name = 'RateLimitError';
  }
}

/**
 * Full auth configuration with Credentials provider
 * This file runs in Node.js runtime (not Edge), so it can use Prisma
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Extract IP address from request
        const ipAddress = getIpAddress(request.headers);

        // Check rate limit BEFORE password verification
        const rateLimitResult = await checkRateLimit(email, ipAddress);

        if (!rateLimitResult.allowed) {
          // Rate limit exceeded
          const remainingMinutes = rateLimitResult.remainingMinutes || 15;
          const reason = rateLimitResult.reason === 'email' ? 'account' : 'IP address';

          throw new RateLimitError(
            `Too many failed login attempts. Your ${reason} is temporarily locked. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} or reset your password.`
          );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          // User not found - record failed attempt
          await recordLoginAttempt(email, ipAddress, false);
          return null;
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
          // Invalid password - record failed attempt
          await recordLoginAttempt(email, ipAddress, false);
          return null;
        }

        // Successful login - record success and clear previous attempts
        await recordLoginAttempt(email, ipAddress, true);
        await clearLoginAttempts(email);

        // Return user object (will be encoded in session)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
});
