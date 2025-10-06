"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UseRequireAuthOptions {
  redirectTo?: string;
  redirectOnAuth?: boolean;
}

export function useRequireAuth({
  redirectTo = "/auth/login",
  redirectOnAuth = false,
}: UseRequireAuthOptions = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user && !redirectOnAuth) {
        router.push(redirectTo);
      } else if (user && redirectOnAuth) {
        router.push("/");
      }
    }
  }, [user, loading, router, redirectTo, redirectOnAuth]);

  return { user, loading };
}

export function useRedirectIfAuthenticated(redirectTo = "/") {
  return useRequireAuth({ redirectTo, redirectOnAuth: true });
}
