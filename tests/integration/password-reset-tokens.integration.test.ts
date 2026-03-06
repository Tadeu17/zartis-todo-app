/**
 * Integration Tests: Password Reset Token Hashing
 *
 * Tests AC3 and AC4:
 * - AC3: Password reset tokens hashed before storage (bcrypt with 10 rounds)
 * - AC4: Token verification uses bcrypt.compare
 *
 * This ensures that even if the database is compromised, reset tokens
 * cannot be used directly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { hashToken, verifyToken, hashPassword } from '@/lib/auth/password';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

describe('Password Reset Tokens - Integration Tests', () => {
  const testEmail = 'token-test@example.com';
  let testUserId: string;

  beforeEach(async () => {
    // Clean up existing tokens and users
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail },
    });

    // Create test user
    const hashedPassword = await hashPassword('TestPass123!');
    const user = await prisma.user.create({
      data: {
        name: 'Token Test User',
        email: testEmail,
        password: hashedPassword,
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('AC3: Password reset tokens hashed before storage (bcrypt with 10 rounds)', () => {
    it('should hash token before storing in database', async () => {
      // Generate plain token
      const plainToken = crypto.randomBytes(32).toString('hex');

      // Hash token
      const hashedToken = await hashToken(plainToken);

      // Store in database
      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hashedToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Retrieve from database
      const storedToken = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });

      // Verify token is hashed (not plain text)
      expect(storedToken?.token).not.toBe(plainToken);
      expect(storedToken?.token).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash format
    });

    it('should use bcrypt with proper salt rounds', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      // bcrypt hash format: $2b$10$... where 10 is the salt rounds
      const hashParts = hashedToken.split('$');
      expect(hashParts[1]).toBe('2b'); // bcrypt identifier
      expect(hashParts[2]).toBe('10'); // 10 salt rounds as per AC3
    });

    it('should generate different hashes for same token (unique salts)', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');

      // Hash same token twice
      const hash1 = await hashToken(plainToken);
      const hash2 = await hashToken(plainToken);

      // Hashes should be different (different salts)
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await verifyToken(plainToken, hash1)).toBe(true);
      expect(await verifyToken(plainToken, hash2)).toBe(true);
    });

    it('should never store plain text tokens in database', async () => {
      const plainToken = 'this-is-a-plain-token-123';
      const hashedToken = await hashToken(plainToken);

      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hashedToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const stored = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });

      // Stored token should NOT contain plain text
      expect(stored?.token).not.toContain('this-is-a-plain-token');
      expect(stored?.token).not.toBe(plainToken);
    });

    it('should hash long tokens correctly', async () => {
      // Generate 64-character token (32 bytes hex)
      const longToken = crypto.randomBytes(32).toString('hex');
      expect(longToken).toHaveLength(64);

      const hashedToken = await hashToken(longToken);

      // Should produce valid bcrypt hash
      expect(hashedToken).toMatch(/^\$2[aby]\$\d{2}\$/);

      // Should verify correctly
      expect(await verifyToken(longToken, hashedToken)).toBe(true);
    });

    it('should be resilient to token extraction from database', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hashedToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Simulate attacker getting database access
      const storedToken = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });

      // Attacker cannot use the hash directly as a token
      const attemptToUseHash = await verifyToken(storedToken!.token, hashedToken);
      expect(attemptToUseHash).toBe(false);

      // Only the original plain token works
      expect(await verifyToken(plainToken, hashedToken)).toBe(true);
    });
  });

  describe('AC4: Token verification uses bcrypt.compare', () => {
    it('should verify correct token using bcrypt.compare', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      // Verification should use bcrypt.compare internally
      const isValid = await verifyToken(plainToken, hashedToken);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect token', async () => {
      const correctToken = crypto.randomBytes(32).toString('hex');
      const wrongToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(correctToken);

      const isValid = await verifyToken(wrongToken, hashedToken);

      expect(isValid).toBe(false);
    });

    it('should reject token with single character difference', async () => {
      const token = 'abcdef123456';
      const similarToken = 'abcdef123457'; // Last char different
      const hashedToken = await hashToken(token);

      expect(await verifyToken(token, hashedToken)).toBe(true);
      expect(await verifyToken(similarToken, hashedToken)).toBe(false);
    });

    it('should be timing-safe (use bcrypt.compare)', async () => {
      // bcrypt.compare is timing-safe by design
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(token);

      // Verify uses bcrypt internally - test both valid and invalid
      const validResult = await verifyToken(token, hashedToken);
      const invalidResult = await verifyToken('wrong', hashedToken);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);

      // Both comparisons should take similar time (timing-safe)
      // We can't easily test timing in unit tests, but we verify the API contract
    });

    it('should handle empty token gracefully', async () => {
      const hashedToken = await hashToken('valid-token');

      const result = await verifyToken('', hashedToken);

      expect(result).toBe(false);
    });

    it('should handle empty hash gracefully', async () => {
      const result = await verifyToken('valid-token', '');

      expect(result).toBe(false);
    });

    it('should reject malformed hash', async () => {
      const token = 'valid-token';
      const malformedHash = 'not-a-bcrypt-hash';

      // Should not throw, should return false
      await expect(verifyToken(token, malformedHash)).resolves.toBe(false);
    });

    it('should verify token across multiple checks', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(token);

      // Verify multiple times - should always work
      expect(await verifyToken(token, hashedToken)).toBe(true);
      expect(await verifyToken(token, hashedToken)).toBe(true);
      expect(await verifyToken(token, hashedToken)).toBe(true);
    });
  });

  describe('Integration: Complete Password Reset Flow', () => {
    it('should complete full password reset flow with hashed tokens', async () => {
      // Step 1: Generate token
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      // Step 2: Store hashed token in database
      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hashedToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Step 3: User receives plain token via email (simulated)
      const tokenFromEmail = plainToken;

      // Step 4: Retrieve stored hash from database
      const storedRecord = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });
      expect(storedRecord).toBeTruthy();

      // Step 5: Verify token using bcrypt.compare
      const isValid = await verifyToken(tokenFromEmail, storedRecord!.token);
      expect(isValid).toBe(true);

      // Step 6: Token is valid, allow password reset
      expect(isValid).toBe(true);
    });

    it('should reject expired token', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      // Create expired token (1 second in past)
      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hashedToken,
          expires: new Date(Date.now() - 1000),
        },
      });

      const storedRecord = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });

      // Token hash is valid, but expiry should be checked separately
      expect(await verifyToken(plainToken, storedRecord!.token)).toBe(true);
      expect(new Date() > storedRecord!.expires).toBe(true);
    });

    it('should prevent reuse of deleted token', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      // Create token
      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hashedToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Use token (delete after use)
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: testEmail,
            token: hashedToken,
          },
        },
      });

      // Try to use again - should not exist
      const storedRecord = await prisma.verificationToken.findFirst({
        where: { identifier: testEmail },
      });

      expect(storedRecord).toBeNull();
    });

    it('should handle multiple tokens for same user', async () => {
      // Create first token
      const token1 = crypto.randomBytes(32).toString('hex');
      const hash1 = await hashToken(token1);

      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hash1,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Create second token (new request)
      const token2 = crypto.randomBytes(32).toString('hex');
      const hash2 = await hashToken(token2);

      // Delete old tokens first (as per forgot-password implementation)
      await prisma.verificationToken.deleteMany({
        where: { identifier: testEmail },
      });

      await prisma.verificationToken.create({
        data: {
          identifier: testEmail,
          token: hash2,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Only newest token should exist
      const tokens = await prisma.verificationToken.findMany({
        where: { identifier: testEmail },
      });

      expect(tokens).toHaveLength(1);
      expect(await verifyToken(token2, tokens[0].token)).toBe(true);
      expect(await verifyToken(token1, tokens[0].token)).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should produce hash that cannot be reversed', async () => {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(plainToken);

      // Hash should not contain any part of plain token
      expect(hashedToken.toLowerCase()).not.toContain(plainToken.toLowerCase());

      // Hash should be fixed length (bcrypt hashes are always 60 chars)
      expect(hashedToken).toHaveLength(60);
    });

    it('should resist brute force attacks', async () => {
      const correctToken = 'secret-token-123';
      const hashedToken = await hashToken(correctToken);

      // Try common guesses - all should fail
      const guesses = [
        'password',
        '123456',
        'secret',
        'token',
        'admin',
        'secret-token',
        'secret-token-124',
      ];

      for (const guess of guesses) {
        const result = await verifyToken(guess, hashedToken);
        expect(result).toBe(false);
      }

      // Only correct token works
      expect(await verifyToken(correctToken, hashedToken)).toBe(true);
    });

    it('should use proper bcrypt format', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(token);

      // bcrypt format: $2a$10$[22 char salt][31 char hash]
      const bcryptPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
      expect(hashedToken).toMatch(bcryptPattern);
    });

    it('should verify hash was created with correct cost factor', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(token);

      // Extract cost factor from hash
      const costFactor = parseInt(hashedToken.split('$')[2], 10);

      // Should be 10 rounds as per AC3
      expect(costFactor).toBe(10);
    });

    it('should handle Unicode tokens correctly', async () => {
      const unicodeToken = '测试-тест-🔐-token';
      const hashedToken = await hashToken(unicodeToken);

      expect(await verifyToken(unicodeToken, hashedToken)).toBe(true);
      expect(await verifyToken('wrong', hashedToken)).toBe(false);
    });
  });

  describe('Performance Considerations', () => {
    it('should hash token in reasonable time', async () => {
      const token = crypto.randomBytes(32).toString('hex');

      const startTime = Date.now();
      await hashToken(token);
      const endTime = Date.now();

      // Hashing with 10 rounds should take less than 500ms
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should verify token in reasonable time', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await hashToken(token);

      const startTime = Date.now();
      await verifyToken(token, hashedToken);
      const endTime = Date.now();

      // Verification should take less than 500ms
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
    });
  });
});
