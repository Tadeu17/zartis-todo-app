import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyToken, validatePassword } from '@/lib/auth/password';
import { clearLoginAttempts } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { message: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { message: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      });

      return NextResponse.json(
        { message: 'Reset link has expired' },
        { status: 400 }
      );
    }

    // Verify token hash
    const isValidToken = await verifyToken(token, verificationToken.token);

    if (!isValidToken) {
      return NextResponse.json(
        { message: 'Invalid reset link' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    // Delete all existing sessions for this user (force re-login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Clear all login attempts for this user (unlock account)
    await clearLoginAttempts(normalizedEmail);

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
