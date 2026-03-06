import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/auth/password';
import crypto from 'crypto';

// Token expiry: 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, we show the same message
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, we have sent a reset link.',
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await hashToken(token);

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
      },
    });

    // Create new token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: hashedToken,
        expires: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    });

    // Build reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // In production, send email via Resend
    // For now, log the reset URL (for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('====================================');
      console.log('PASSWORD RESET LINK (development only):');
      console.log(resetUrl);
      console.log('====================================');
    }

    // TODO: Send email via Resend when API key is configured
    // if (process.env.RESEND_API_KEY) {
    //   await sendPasswordResetEmail(normalizedEmail, resetUrl);
    // }

    return NextResponse.json({
      message: 'If an account exists with that email, we have sent a reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
