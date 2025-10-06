"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface AuthErrorProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
}

export default function AuthError({
  title = "Anmeldung erforderlich",
  message = "Du musst angemeldet sein, um diese Seite zu sehen.",
  showLoginButton = true,
}: AuthErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <Card className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          {showLoginButton && (
            <div className="flex flex-col gap-4">
              <Link href="/auth/login">
                <Button className="w-full">Anmelden</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full">
                  Registrieren
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
