import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { AnimatedCounter } from "@/components/AnimatedCounter";

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

async function getHomeStats() {
  try {
    // Fetch summary stats and recent appearances in parallel
    const [summaryResult, recentResult] = await Promise.all([
      supabase
        .from("tv_show_politicians")
        .select("episode_date, politician_name, party_name")
        .neq("show_name", "Phoenix Runde")
        .neq("show_name", "Phoenix Persönlich")
        .neq("show_name", "Pinar Atalay")
        .neq("show_name", "Blome & Pfeffer"),
      supabase
        .from("tv_show_politicians")
        .select("show_name, episode_date, politician_name, party_name")
        .order("episode_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(8),
    ]);

    const allData = summaryResult.data || [];
    const recentData = recentResult.data || [];

    const totalAppearances = allData.length;
    const totalEpisodes = new Set(allData.map((d) => d.episode_date)).size;
    const uniquePoliticians = new Set(allData.map((d) => d.politician_name))
      .size;
    const partiesRepresented = new Set(
      allData.filter((d) => d.party_name).map((d) => d.party_name),
    ).size;

    return {
      totalAppearances,
      totalEpisodes,
      uniquePoliticians,
      partiesRepresented,
      recentAppearances: recentData,
    };
  } catch {
    return null;
  }
}

const NAV_CARDS = [
  {
    href: "/uebersicht",
    emoji: "📈",
    title: "Übersicht",
    desc: "Gesamtstatistiken und Durchschnittswerte aller Politik-Auftritte",
    hoverColor: "hover:border-blue-400 hover:shadow-blue-100",
    textColor: "group-hover:text-blue-600",
    bgGradient: "from-blue-50 to-blue-100/50",
  },
  {
    href: "/parteien",
    emoji: "📊",
    title: "Parteien",
    desc: "Interaktive Charts zur Verteilung der Politiker nach Parteien",
    hoverColor: "hover:border-green-400 hover:shadow-green-100",
    textColor: "group-hover:text-green-600",
    bgGradient: "from-green-50 to-green-100/50",
  },
  {
    href: "/politiker",
    emoji: "📋",
    title: "Politiker",
    desc: "Detaillierte Tabelle aller Politiker mit ihren Auftritten",
    hoverColor: "hover:border-purple-400 hover:shadow-purple-100",
    textColor: "group-hover:text-purple-600",
    bgGradient: "from-purple-50 to-purple-100/50",
  },
  {
    href: "/sendungen",
    emoji: "📺",
    title: "Sendungen",
    desc: "Chronologische Übersicht aller Sendungen mit Politik-Gästen",
    hoverColor: "hover:border-orange-400 hover:shadow-orange-100",
    textColor: "group-hover:text-orange-600",
    bgGradient: "from-orange-50 to-orange-100/50",
  },
  {
    href: "/politiker-rankings",
    emoji: "🏆",
    title: "Rankings",
    desc: "Top-Listen der meistgeladenen Talkshow-Gäste nach Kategorie",
    hoverColor: "hover:border-yellow-400 hover:shadow-yellow-100",
    textColor: "group-hover:text-yellow-600",
    bgGradient: "from-yellow-50 to-yellow-100/50",
  },
  {
    href: "/parteien-zeitverlauf",
    emoji: "📅",
    title: "Zeitverlauf",
    desc: "Monatliche Entwicklung der Partei-Auftritte über das Jahr",
    hoverColor: "hover:border-teal-400 hover:shadow-teal-100",
    textColor: "group-hover:text-teal-600",
    bgGradient: "from-teal-50 to-teal-100/50",
  },
];

const FEATURES = [
  {
    emoji: "📊",
    title: "Interaktive Charts",
    desc: "Visualisieren Sie die Verteilung der Politik-Gäste mit ansprechenden Diagrammen",
  },
  {
    emoji: "📈",
    title: "Detaillierte Statistiken",
    desc: "Erhalten Sie Einblicke in Auftrittshäufigkeiten und Trends",
  },
  {
    emoji: "🔍",
    title: "Aktuelle Daten",
    desc: "Basierend auf den neuesten Sendungen und abgeordnetenwatch.de",
  },
];

export default async function Home() {
  const stats = await getHomeStats();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Hero Section */}
        <section className="text-center" aria-label="Willkommen">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 mb-6">
            <Image
              src="/transparent_logo.png"
              alt="Polittalk-Watcher Logo"
              width={200}
              height={200}
              priority
              className="size-36 md:size-52"
            />
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              TV Politik Dashboard
            </h1>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Entdecken Sie die Politik-Landschaft deutscher Talkshows mit
            interaktiven Statistiken und detaillierten Analysen zu
            Politiker-Auftritten.
          </p>
        </section>

        {/* Live Stats Section */}
        {stats && (
          <section
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12"
            aria-label="Aktuelle Kennzahlen"
          >
            <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 text-center shadow-sm border border-blue-200/60">
              <AnimatedCounter
                end={stats.totalAppearances}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700 block"
              />
              <span className="text-xs sm:text-sm text-blue-600 mt-1 block">
                Auftritte gesamt
              </span>
            </div>
            <div className="bg-linear-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-6 text-center shadow-sm border border-green-200/60">
              <AnimatedCounter
                end={stats.totalEpisodes}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 block"
              />
              <span className="text-xs sm:text-sm text-green-600 mt-1 block">
                Sendungen erfasst
              </span>
            </div>
            <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 text-center shadow-sm border border-purple-200/60">
              <AnimatedCounter
                end={stats.uniquePoliticians}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 block"
              />
              <span className="text-xs sm:text-sm text-purple-600 mt-1 block">
                Politiker erfasst
              </span>
            </div>
            <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-xl p-4 sm:p-6 text-center shadow-sm border border-orange-200/60">
              <AnimatedCounter
                end={stats.partiesRepresented}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-700 block"
              />
              <span className="text-xs sm:text-sm text-orange-600 mt-1 block">
                Parteien vertreten
              </span>
            </div>
          </section>
        )}

        {/* Navigation Cards */}
        <section aria-label="Navigation">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {NAV_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 sm:p-6 border border-gray-200 ${card.hoverColor} hover:-translate-y-0.5`}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-linear-to-br ${card.bgGradient} mb-4 text-2xl`}
                >
                  {card.emoji}
                </div>
                <h3
                  className={`text-lg sm:text-xl font-semibold text-gray-900 mb-2 ${card.textColor} transition-colors`}
                >
                  {card.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {card.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Appearances */}
        {stats?.recentAppearances && stats.recentAppearances.length > 0 && (
          <section className="mt-12 sm:mt-16" aria-label="Letzte Auftritte">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              Letzte Auftritte
            </h2>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {stats.recentAppearances.map((appearance, idx) => (
                  <div
                    key={`${appearance.episode_date}-${appearance.politician_name}-${idx}`}
                    className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {appearance.politician_name}
                      </span>
                      {appearance.party_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                          {appearance.party_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 whitespace-nowrap ml-4">
                      <span className="hidden sm:inline">
                        {appearance.show_name}
                      </span>
                      <span>
                        {new Date(appearance.episode_date).toLocaleDateString(
                          "de-DE",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section
          className="bg-gray-50 rounded-xl p-6 sm:p-8 mt-12 sm:mt-16"
          aria-label="Features"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">
            Was Sie erwartet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="text-3xl mb-3" aria-hidden="true">
                  {feature.emoji}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="mt-12 sm:mt-16 text-center" aria-label="Über uns">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Über dieses Dashboard
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Dieses Dashboard analysiert die Auftritte von Politikern in
            deutschen Talkshows (Markus Lanz, Maybrit Illner, Caren Miosga &
            Maischberger) und stellt die Daten in verschiedenen interaktiven
            Formaten dar. Die Informationen werden regelmäßig aktualisiert und
            basieren auf öffentlich verfügbaren Quellen.
          </p>
        </section>
      </div>
    </>
  );
}
