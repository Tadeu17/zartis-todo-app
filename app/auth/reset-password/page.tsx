import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '../_components';

export const metadata: Metadata = {
  title: 'Reset Password | Todo App',
  description: 'Set a new password for your Todo App account',
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const { token, email } = params;

  // Redirect if missing required params
  if (!token || !email) {
    redirect('/auth/forgot-password');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Todo App
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Set a new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <ResetPasswordForm token={token} email={email} />
        </div>
      </div>
    </div>
  );
}
