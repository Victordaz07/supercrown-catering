"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-sans p-8 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-6 max-w-md text-center">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          Try again
        </button>
        <p className="text-sm text-gray-500 mt-8">
          If the problem continues, restart the server: stop <code>npm run dev</code> and run it again.
        </p>
      </body>
    </html>
  );
}
