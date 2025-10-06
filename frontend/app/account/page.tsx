"use client";

import AccountSettings from "@/components/account/AccountSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthLoading from "@/components/auth/AuthLoading";
import AuthError from "@/components/auth/AuthError";

export default function AccountPage() {
  return <AccountPageContent />;
}

function AccountPageContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return (
      <AuthError
        title="Anmeldung erforderlich"
        message="Du musst angemeldet sein, um deine Account-Einstellungen zu sehen."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mein Account</h1>
          <p className="mt-2 text-gray-600">
            Verwalte deine Account-Einstellungen und Sicherheit
          </p>
        </div>

        <AccountSettings />
      </div>
    </div>
  );
}
