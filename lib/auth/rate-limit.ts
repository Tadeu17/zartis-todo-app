/**
 * Rate Limiting Service
 * Protects against brute force attacks by limiting login attempts
 */

import { prisma } from '@/lib/prisma';

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS_PER_EMAIL: 5, // Maximum failed attempts per email
  MAX_ATTEMPTS_PER_IP: 10, // Maximum failed attempts per IP
  LOCKOUT_DURATION_MINUTES: 15, // Lockout duration in minutes
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remainingMinutes?: number;
  reason?: 'email' | 'ip';
}

/**
 * Check if a login attempt is allowed based on rate limits
 * @param email - User's email address
 * @param ipAddress - Client IP address
 * @returns Result indicating if attempt is allowed and remaining lockout time
 */
export async function checkRateLimit(
  email: string,
  ipAddress: string
): Promise<RateLimitResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const cutoffTime = new Date(
    Date.now() - RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
  );

  // Check email-based rate limit
  const emailAttempts = await prisma.loginAttempt.count({
    where: {
      email: normalizedEmail,
      success: false,
      createdAt: {
        gte: cutoffTime,
      },
    },
  });

  if (emailAttempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL) {
    // Get the oldest failed attempt to calculate remaining lockout time
    const oldestAttempt = await prisma.loginAttempt.findFirst({
      where: {
        email: normalizedEmail,
        success: false,
        createdAt: {
          gte: cutoffTime,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (oldestAttempt) {
      const lockoutExpiry = new Date(
        oldestAttempt.createdAt.getTime() +
          RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
      const remainingMs = lockoutExpiry.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

      return {
        allowed: false,
        remainingMinutes,
        reason: 'email',
      };
    }
  }

  // Check IP-based rate limit
  const ipAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress,
      success: false,
      createdAt: {
        gte: cutoffTime,
      },
    },
  });

  if (ipAttempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_IP) {
    // Get the oldest failed attempt to calculate remaining lockout time
    const oldestAttempt = await prisma.loginAttempt.findFirst({
      where: {
        ipAddress,
        success: false,
        createdAt: {
          gte: cutoffTime,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (oldestAttempt) {
      const lockoutExpiry = new Date(
        oldestAttempt.createdAt.getTime() +
          RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
      const remainingMs = lockoutExpiry.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

      return {
        allowed: false,
        remainingMinutes,
        reason: 'ip',
      };
    }
  }

  return { allowed: true };
}

/**
 * Record a login attempt (success or failure)
 * @param email - User's email address
 * @param ipAddress - Client IP address
 * @param success - Whether the login attempt was successful
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  await prisma.loginAttempt.create({
    data: {
      email: normalizedEmail,
      ipAddress,
      success,
    },
  });
}

/**
 * Clear all login attempts for a user (called on successful login or password reset)
 * @param email - User's email address
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  await prisma.loginAttempt.deleteMany({
    where: {
      email: normalizedEmail,
    },
  });
}

/**
 * Clean up old login attempts (optional maintenance task)
 * Removes attempts older than the lockout duration
 */
export async function cleanupOldAttempts(): Promise<void> {
  const cutoffTime = new Date(
    Date.now() - RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
  );

  await prisma.loginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: cutoffTime,
      },
    },
  });
}
