import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { valid: false, message: 'Token and email are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { valid: false, message: 'Invalid or expired reset link' },
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
        { valid: false, message: 'Reset link has expired' },
        { status: 400 }
      );
    }

    // Verify token hash
    const isValidToken = await verifyToken(token, verificationToken.token);

    if (!isValidToken) {
      return NextResponse.json(
        { valid: false, message: 'Invalid reset link' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Validate reset token error:', error);
    return NextResponse.json(
      { valid: false, message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
