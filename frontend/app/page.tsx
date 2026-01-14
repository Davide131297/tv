import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "TV Politik Dashboard – Statistiken zu deutschen Polit-Talkshows",
  description:
    "Entdecken Sie die Politik-Landschaft deutscher Talkshows mit interaktiven Statistiken und detaillierten Analysen zu Politiker-Auftritten bei Lanz, Illner, Maischberger und mehr.",
  openGraph: {
    title: "TV Politik Dashboard | Polittalk-Watcher",
    description:
      "Interaktive Statistiken und Analysen zu Politiker-Auftritten in deutschen Talkshows.",
  },
};

// JSON-LD strukturierte Daten für bessere Suchergebnisse
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Polittalk-Watcher",
  alternateName: "TV Politik Dashboard",
  url: "https://polittalk-watcher.de",
  description:
    "Interaktive Statistiken und Analysen zu Politiker-Auftritten in deutschen TV-Talkshows wie Markus Lanz, Maybrit Illner, Caren Miosga und Maischberger.",
  publisher: {
    "@type": "Organization",
    name: "Polittalk-Watcher",
    url: "https://polittalk-watcher.de",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate:
        "https://polittalk-watcher.de/politiker?search={search_term}",
    },
    "query-input": "required name=search_term",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 mb-6">
            <Image
              src="/transparent_logo.png"
              alt="Polittalk-Watcher Logo"
              width={200}
              height={200}
              className="size-36 md:size-52"
            />
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              TV Politik Dashboard
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Entdecken Sie die Politik-Landschaft deutscher Talkshows mit
            interaktiven Statistiken und detaillierten Analysen zu
            Politiker-Auftritten.
          </p>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <Link
              href="/uebersicht"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300"
            >
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                Übersicht
              </h3>
              <p className="text-gray-600 text-sm">
                Gesamtstatistiken und Durchschnittswerte aller Politik-Auftritte
              </p>
            </Link>

            <Link
              href="/parteien"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-green-300"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600">
                Parteien
              </h3>
              <p className="text-gray-600 text-sm">
                Interaktive Charts zur Verteilung der Politiker nach Parteien
              </p>
            </Link>

            <Link
              href="/politiker"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-purple-300"
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600">
                Politiker
              </h3>
              <p className="text-gray-600 text-sm">
                Detaillierte Tabelle aller Politiker mit ihren Auftritten
              </p>
            </Link>

            <Link
              href="/sendungen"
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-orange-300"
            >
              <div className="text-4xl mb-4">📺</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600">
                Sendungen
              </h3>
              <p className="text-gray-600 text-sm">
                Chronologische Übersicht aller Sendungen mit Politik-Gästen
              </p>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-gray-50 rounded-lg p-8 mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Was Sie erwartet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold mb-2">Interaktive Charts</h3>
              <p className="text-gray-600 text-sm">
                Visualisieren Sie die Verteilung der Politik-Gäste mit
                ansprechenden Diagrammen
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-lg font-semibold mb-2">
                Detaillierte Statistiken
              </h3>
              <p className="text-gray-600 text-sm">
                Erhalten Sie Einblicke in Auftrittshäufigkeiten und Trends
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold mb-2">Aktuelle Daten</h3>
              <p className="text-gray-600 text-sm">
                Basierend auf den neuesten Sendungen und abgeordnetenwatch.de
              </p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Über dieses Dashboard
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Dieses Dashboard analysiert die Auftritte von Politikern in
            deutschen Talkshows (Markus Lanz, Maybrit Illner, Caren Miosga &
            Maischberger) und stellt die Daten in verschiedenen interaktiven
            Formaten dar. Die Informationen werden regelmäßig aktualisiert und
            basieren auf öffentlich verfügbaren Quellen.
          </p>
        </div>
      </div>
    </>
  );
}
