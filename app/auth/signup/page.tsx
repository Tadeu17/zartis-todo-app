import { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '../_components';

export const metadata: Metadata = {
  title: 'Sign Up | Todo App',
  description: 'Create your Todo App account',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Todo App
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start managing your todos today
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <SignupForm />
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
