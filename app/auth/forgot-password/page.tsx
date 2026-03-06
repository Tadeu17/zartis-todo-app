import { Metadata } from 'next';
import { ForgotPasswordForm } from '../_components';

export const metadata: Metadata = {
  title: 'Forgot Password | Todo App',
  description: 'Reset your Todo App password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Todo App
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your
            password.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
