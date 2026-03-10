import { Link } from 'react-router-dom';

interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Coming Soon</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-gray-600">
          This page has not been implemented yet.
        </p>
        <Link
          to="/"
          className="inline-flex mt-6 items-center rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Back To Jobs
        </Link>
      </div>
    </div>
  );
}
