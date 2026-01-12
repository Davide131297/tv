import DatabaseEntries from "@/components/database/DatabaseEntries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenbank",
  description:
    "Vollständige Datenbank aller TV-Show-Politiker-Einträge. Durchsuchbares Archiv mit Feedback-Möglichkeit.",
  openGraph: {
    title: "Datenbank | Polittalk-Watcher",
    description: "Durchsuchbare Datenbank aller erfassten Politiker-Auftritte.",
  },
};

export default function DatabasePage() {
  return (
    <div className="container mx-auto py-8 px-4">
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
