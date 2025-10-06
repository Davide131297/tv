"use client";

import DatabaseEntries from "@/components/database/DatabaseEntries";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthLoading from "@/components/auth/AuthLoading";
import AuthError from "@/components/auth/AuthError";

export default function DatabasePage() {
  return <DatabasePageContent />;
}

function DatabasePageContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return (
      <AuthError
        title="Anmeldung erforderlich"
        message="Du musst angemeldet sein, um die Datenbank-Einträge zu sehen."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Datenbank Einträge
          </h1>
          <p className="mt-2 text-gray-600">
            Alle TV-Show-Politiker-Einträge aus der Datenbank. Du kannst
            Feedback zu einzelnen Einträgen geben.
          </p>
        </div>

        <DatabaseEntries />
      </div>
    </div>
  );
}
