'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="font-display text-3xl mb-4">Something went sideways</h2>
        <p className="text-ink/60 mb-6">
          Looks like a small hiccup. Let&apos;s try again.
        </p>
        <button
          onClick={reset}
          className="bg-ink text-cream px-6 py-3 rounded-full text-sm font-medium hover:bg-clay transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
