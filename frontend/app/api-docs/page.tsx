import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const metadata = {
  title: "API Dokumentation | Polittalk-Watcher",
  description: "Dokumentation für die öffentliche API von Polittalk-Watcher.",
};

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8 border-b pb-8">
        <h1 className="text-4xl font-bold mb-4">Öffentliche API</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Die öffentliche API (v1) ermöglicht den Zugriff auf Daten zu
          politischen Parteien, Politiker-Auftritten und diskutierten Themen in
          deutschen TV-Talkshows.
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <a href="/postman_collection.json" download="tv_stats_api.json">
              <Download className="mr-2 h-4 w-4" />
              Postman Collection herunterladen
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <div className="bg-slate-50 p-4 rounded-lg border mb-4">
            <span className="font-mono bg-slate-200 px-2 py-1 rounded text-sm mr-2">
              BASIS-URL
            </span>
            <code className="text-blue-600 font-mono">
              https://polittalk-watcher.de/api/v1
            </code>
          </div>
        </section>

        <section id="party-timeline">
          <h2 className="text-2xl font-semibold mb-3">
            1. Parteien-Zeitverlauf
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
              GET
            </span>
            <code className="bg-slate-100 px-2 py-1 rounded">
              /party-timeline
            </code>
          </div>
          <p className="text-gray-700 mb-4">
            Gibt die Häufigkeit von Parteiauftritten im Zeitverlauf zurück,
            gruppiert nach Monat. Ohne Parameter wird das aktuelle Jahr
            verwendet.
          </p>

          <h3 className="font-semibold mb-2">Parameter</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mb-4">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="py-2 px-3">Parameter</th>
                  <th className="py-2 px-3">Typ</th>
                  <th className="py-2 px-3">Erforderlich</th>
                  <th className="py-2 px-3">Beschreibung</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">year</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">
                    Filter nach Jahr (z.B. 2024). &quot;all&quot; für alle.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">show</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">
                    Filter nach Sendung (z.B. Markus Lanz).
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">tv_channel</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Filter nach Sender (z.B. ZDF).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="political-areas">
          <h2 className="text-2xl font-semibold mb-3">2. Politische Themen</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
              GET
            </span>
            <code className="bg-slate-100 px-2 py-1 rounded">
              /political-areas
            </code>
          </div>
          <p className="text-gray-700 mb-4">
            Gibt Statistiken zu den in Sendungen diskutierten Themen zurück.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mb-4">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="py-2 px-3">Parameter</th>
                  <th className="py-2 px-3">Typ</th>
                  <th className="py-2 px-3">Erforderlich</th>
                  <th className="py-2 px-3">Beschreibung</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">year</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Filter nach Jahr.</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">show</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Filter nach Sendung.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">tv_channel</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Filter nach Sender.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="politician-details">
          <h2 className="text-2xl font-semibold mb-3">3. Politiker-Details</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
              GET
            </span>
            <code className="bg-slate-100 px-2 py-1 rounded">
              /politician-details
            </code>
          </div>
          <p className="text-gray-700 mb-4">
            Gibt Auftritte eines bestimmten Politikers zurück.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mb-4">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="py-2 px-3">Parameter</th>
                  <th className="py-2 px-3">Typ</th>
                  <th className="py-2 px-3">Erforderlich</th>
                  <th className="py-2 px-3">Beschreibung</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">first_name</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 font-semibold text-red-600">Ja</td>
                  <td className="py-2 px-3">Vorname (oder `firstname`)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">last_name</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 font-semibold text-red-600">Ja</td>
                  <td className="py-2 px-3">Nachname (oder `lastname`)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">year</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Filter nach Jahr.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="politics">
          <h2 className="text-2xl font-semibold mb-3">
            4. Allgemeine Statistiken
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
              GET
            </span>
            <code className="bg-slate-100 px-2 py-1 rounded">/politics</code>
          </div>
          <p className="text-gray-700 mb-4">
            Vielseitiger Endpunkt für verschiedene Statistiken.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mb-4">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="py-2 px-3">Parameter</th>
                  <th className="py-2 px-3">Typ</th>
                  <th className="py-2 px-3">Erforderlich</th>
                  <th className="py-2 px-3">Beschreibung</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">type</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 font-semibold text-red-600">Ja</td>
                  <td className="py-2 px-3">
                    Art der Statistik (z.B. `party-stats`, `episodes`, `recent`)
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3 font-mono">year</td>
                  <td className="py-2 px-3">string</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Filter nach Jahr.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono">limit</td>
                  <td className="py-2 px-3">number</td>
                  <td className="py-2 px-3 text-gray-500">Nein</td>
                  <td className="py-2 px-3">Limitierung der Ergebnisse.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
