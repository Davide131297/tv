"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function AccountSettings() {
  const { user, refreshSession } = useAuth();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Email change states
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Account deletion states
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        showMessage("error", error.message);
        return;
      }

      showMessage(
        "success",
        "E-Mail-Änderung initiiert. Bitte bestätige die neue E-Mail-Adresse über den Link in deiner E-Mail."
      );
      setNewEmail("");
    } catch (err) {
      showMessage("error", "Ein unerwarteter Fehler ist aufgetreten");
      console.error("Email change error:", err);
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    // Validate password
    if (newPassword.length < 6) {
      showMessage(
        "error",
        "Das neue Passwort muss mindestens 6 Zeichen lang sein"
      );
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showMessage("error", "Die neuen Passwörter stimmen nicht überein");
      setPasswordLoading(false);
      return;
    }

    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        showMessage("error", "Aktuelles Passwort ist falsch");
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        showMessage("error", error.message);
        return;
      }

      showMessage("success", "Passwort erfolgreich geändert");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Refresh session
      await refreshSession();
    } catch (err) {
      showMessage("error", "Ein unerwarteter Fehler ist aufgetreten");
      console.error("Password change error:", err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAccountDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);

    // Validate password confirmation
    if (!deleteConfirmPassword) {
      showMessage("error", "Bitte gib dein Passwort zur Bestätigung ein");
      setDeleteLoading(false);
      return;
    }

    // Validate confirmation text
    if (deleteConfirmText !== "ACCOUNT LÖSCHEN") {
      showMessage(
        "error",
        "Bitte gib exakt 'ACCOUNT LÖSCHEN' ein, um zu bestätigen"
      );
      setDeleteLoading(false);
      return;
    }

    try {
      // Call API route for account deletion
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        showMessage("error", "Keine gültige Session gefunden");
        setDeleteLoading(false);
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          password: deleteConfirmPassword,
          confirmText: deleteConfirmText,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(
          "error",
          result.error || "Fehler beim Löschen des Accounts"
        );
        return;
      }

      // Sign out the user
      await supabase.auth.signOut();

      showMessage("success", "Account wurde erfolgreich gelöscht");

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      showMessage("error", "Ein unerwarteter Fehler ist aufgetreten");
      console.error("Account deletion error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          Du musst angemeldet sein, um deine Account-Einstellungen zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Global Message */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Account Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Account Information
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Aktuelle E-Mail-Adresse
            </label>
            <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
              {user.email}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account erstellt
            </label>
            <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("de-DE")
                : "Unbekannt"}
            </p>
          </div>
        </div>
      </Card>

      {/* Email Change */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          E-Mail-Adresse ändern
        </h2>
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <label
              htmlFor="newEmail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Neue E-Mail-Adresse
            </label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue@email.de"
              required
              disabled={emailLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={emailLoading || !newEmail}
            className="w-full sm:w-auto"
          >
            {emailLoading ? "Wird geändert..." : "E-Mail ändern"}
          </Button>
          <p className="text-sm text-gray-600">
            Du erhältst eine Bestätigungs-E-Mail an die neue Adresse.
          </p>
        </form>
      </Card>

      {/* Password Change */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Passwort ändern
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Aktuelles Passwort
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Dein aktuelles Passwort"
              required
              disabled={passwordLoading}
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Neues Passwort
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              required
              disabled={passwordLoading}
            />
          </div>
          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Neues Passwort bestätigen
            </label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Neues Passwort wiederholen"
              required
              disabled={passwordLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={
              passwordLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmNewPassword
            }
            className="w-full sm:w-auto"
          >
            {passwordLoading ? "Wird geändert..." : "Passwort ändern"}
          </Button>
        </form>
      </Card>

      {/* Account Deletion */}
      <Card className="p-6 border-red-200 bg-red-50">
        <h2 className="text-xl font-semibold text-red-900 mb-4">
          Account löschen
        </h2>

        {!showDeleteConfirm ? (
          <div>
            <p className="text-sm text-red-700 mb-4">
              Das Löschen deines Accounts kann nicht rückgängig gemacht werden.
              Alle deine Daten werden permanent entfernt.
            </p>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              Account löschen
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAccountDelete} className="space-y-4">
            <div className="bg-white p-4 rounded border border-red-200">
              <h3 className="font-medium text-red-900 mb-2">
                ⚠️ Warnung: Account wird permanent gelöscht
              </h3>
              <p className="text-sm text-red-700 mb-3">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle deine
                Daten werden unwiderruflich gelöscht.
              </p>
            </div>

            <div>
              <label
                htmlFor="deleteConfirmPassword"
                className="block text-sm font-medium text-red-700 mb-1"
              >
                Passwort zur Bestätigung
              </label>
              <Input
                id="deleteConfirmPassword"
                type="password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                placeholder="Dein aktuelles Passwort"
                required
                disabled={deleteLoading}
              />
            </div>

            <div>
              <label
                htmlFor="deleteConfirmText"
                className="block text-sm font-medium text-red-700 mb-1"
              >
                Gib &quot;ACCOUNT LÖSCHEN&quot; ein, um zu bestätigen
              </label>
              <Input
                id="deleteConfirmText"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="ACCOUNT LÖSCHEN"
                required
                disabled={deleteLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  deleteLoading ||
                  !deleteConfirmPassword ||
                  deleteConfirmText !== "ACCOUNT LÖSCHEN"
                }
                className="flex-1 sm:flex-none"
              >
                {deleteLoading
                  ? "Wird gelöscht..."
                  : "Account permanent löschen"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmPassword("");
                  setDeleteConfirmText("");
                }}
                disabled={deleteLoading}
                className="flex-1 sm:flex-none"
              >
                Abbrechen
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
