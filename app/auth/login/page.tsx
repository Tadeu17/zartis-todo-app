import { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '../_components';

export const metadata: Metadata = {
  title: 'Log In | Todo App',
  description: 'Log in to your Todo App account',
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    message?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || '/';
  const message = params.message;
  const error = params.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Todo App
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Log in to access your todos
          </p>
        </div>

        {message && (
          <div
            className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm"
            role="alert"
          >
            {decodeURIComponent(message)}
          </div>
        )}

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
            role="alert"
          >
            {error === 'CredentialsSignin'
              ? 'Invalid email or password'
              : 'An error occurred. Please try again.'}
          </div>
        )}

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
