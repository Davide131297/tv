import { EpisodeData } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PoliticianModal from "./PoliticianModal";

type LastShowTableProps = {
  episodes: EpisodeData[];
};

function getPartyColorClass(partyName: string) {
  switch (partyName) {
    case "CDU":
      return "bg-black text-white";
    case "CSU":
      return "bg-blue-800 text-white";
    case "SPD":
      return "bg-red-600 text-white";
    case "FDP":
      return "bg-yellow-400 text-black";
    case "Die Linke":
      return "bg-[#DF007D] text-white";
    case "BÜNDNIS 90/DIE GRÜNEN":
      return "bg-green-400 text-green-900 border-green-200";
    case "AfD":
      return "bg-blue-600 text-white";
    case "BSW":
      return "bg-yellow-700 text-white";
    case "parteilos":
      return "bg-gray-500 text-white";
    case "ÖVP":
      return "bg-[#63c3d0] text-white";
    case "FREIE WÄHLER":
      return "bg-[#f97316] text-white";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function LastShowTable({ episodes }: LastShowTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Letzte Sendungen
        </h2>
      </div>

      {/* Mobile Card Layout */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {episodes.map((episode) => {
            const date = new Date(episode.episode_date);
            const formattedDate = date.toLocaleDateString("de-DE");
            const weekday = date.toLocaleDateString("de-DE", {
              weekday: "long",
            });

            return (
              <div
                key={episode.episode_date}
                className="p-4 space-y-3 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {formattedDate}
                    </div>
                    <div className="text-xs text-gray-500">{weekday}</div>
                  </div>
                  <div className="text-right flex flex-col items-end space-y-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {episode.politician_count} Politiker
                    </div>
                    {episode.episode_url ? (
                      <Link
                        href={episode.episode_url}
                        target="_blank"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        🔗 Episode öffnen
                      </Link>
                    ) : (
                      <span className="text-gray-400">Nicht verfügbar</span>
                    )}
                  </div>
                </div>

                {episode.politicians.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Anwesende Politiker
                    </div>
                    <div className="space-y-1">
                      {episode.politicians.map((politician, idx) => (
                        <div
                          key={`${episode.episode_date}-${politician.name}-${idx}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <PoliticianModal
                            politicianName={politician.name}
                            politicianParty={politician.party_name}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium text-blue-600"
                          />
                          <span
                            className={cn(
                              "text-xs px-2 py-1 rounded",
                              politician.party_name
                                ? getPartyColorClass(politician.party_name)
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {politician.party_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Keine Politik-Gäste
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Anzahl
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Anwesende Politiker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wochentag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Episode
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {episodes.map((episode, index) => {
              const date = new Date(episode.episode_date);
              const formattedDate = date.toLocaleDateString("de-DE");
              const weekday = date.toLocaleDateString("de-DE", {
                weekday: "long",
              });

              return (
                <tr
                  key={episode.episode_date}
                  className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                    episode.episode_url
                      ? "hover:bg-blue-50 cursor-pointer transition-colors"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formattedDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {episode.politician_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {episode.politicians.length > 0 ? (
                      <div className="space-y-1">
                        {episode.politicians.map((politician, idx) => (
                          <div
                            key={`${episode.episode_date}-${politician.name}-${idx}`}
                            className="flex items-center space-x-2"
                          >
                            <PoliticianModal
                              politicianName={politician.name}
                              politicianParty={politician.party_name}
                              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium text-blue-600"
                            />
                            <span
                              className={cn(
                                "text-xs px-2 py-1 rounded",
                                politician.party_name
                                  ? getPartyColorClass(politician.party_name)
                                  : "bg-gray-100 text-gray-600"
                              )}
                            >
                              {politician.party_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">
                        Keine Politik-Gäste
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {weekday}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {episode.episode_url ? (
                      <Link
                        href={episode.episode_url}
                        target="_blank"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        🔗 Episode öffnen
                      </Link>
                    ) : (
                      <span className="text-gray-400">Nicht verfügbar</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
