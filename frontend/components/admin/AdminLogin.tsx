"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Login fehlgeschlagen.");
      }

      setPassword("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Login fehlgeschlagen.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_40%),linear-gradient(135deg,#f8fafc_0%,#e2e8f0_45%,#f1f5f9_100%)] px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card className="border-slate-200/80 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-950">
              Admin Dashboard
            </CardTitle>
            <CardDescription>
              Diese Route ist nicht in der Website verlinkt und nur per Direktlink erreichbar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="admin-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Passwort
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Passwort eingeben"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Prüfe Passwort..." : "Einloggen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
