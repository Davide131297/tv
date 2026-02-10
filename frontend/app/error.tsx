"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fehler:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-gray-900">
          Etwas ist schiefgelaufen
        </h2>
        <p className="text-gray-600 max-w-md">
          Beim Laden der Seite ist ein Fehler aufgetreten. Bitte versuche es
          erneut.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
