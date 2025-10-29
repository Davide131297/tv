"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { FETCH_HEADERS } from "@/lib/utils";
import { BADGE_PARTY_COLORS } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

interface PoliticianRanking {
  politician_name: string;
  party_name: string;
  total_appearances: number;
  shows_appeared_on: number;
  show_names: string[];
  latest_appearance: string;
  first_appearance: string;
}

interface PoliticianRankingsResponse {
  success: boolean;
  data: PoliticianRanking[];
  metadata: {
    total_politicians: number;
    show_filter: string;
    limit: number;
  };
}

const SHOW_OPTIONS = [
  { value: "all", label: "Alle Shows" },
  { value: "Markus Lanz", label: "Markus Lanz" },
  { value: "Maybrit Illner", label: "Maybrit Illner" },
  { value: "Caren Miosga", label: "Caren Miosga" },
  { value: "Maischberger", label: "Maischberger" },
  { value: "Hart aber fair", label: "Hart aber fair" },
];

// Badge Komponente
const Badge = ({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}) => {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
  const variantClasses = {
    default: "bg-blue-100 text-blue-800 border-blue-200",
    outline: "bg-white text-gray-700 border-gray-300",
    secondary: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Skeleton Komponente
const Skeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );
};

export default function PoliticianRankings() {
  const [rankings, setRankings] = useState<PoliticianRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string>("all");
  const [metadata, setMetadata] = useState<
    PoliticianRankingsResponse["metadata"] | null
  >(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  // generate years from 2024 up to current year (descending order)
  const years = useMemo(() => {
    const start = 2024;
    const end = new Date().getFullYear();
    const list: string[] = [];
    for (let y = end; y >= start; y--) list.push(String(y));
    return list;
  }, []);

  const fetchRankings = useCallback(
    async (showFilter: string = "", yearFilter: string = "") => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type: "politician-rankings",
          limit: "50",
        });

        if (showFilter && showFilter !== "all") {
          params.set("show", showFilter);
        }

        if (yearFilter !== undefined) {
          params.set("year", yearFilter);
        }

        const response = await fetch(`/api/politics?${params}`, {
          method: "GET",
          headers: FETCH_HEADERS,
        });
        const result: PoliticianRankingsResponse = await response.json();

        if (result.success) {
          const sorted = [...result.data].sort((a, b) => {
            if (b.total_appearances !== a.total_appearances) {
              return b.total_appearances - a.total_appearances;
            }

            const at = new Date(a.latest_appearance).getTime() || 0;
            const bt = new Date(b.latest_appearance).getTime() || 0;
            return bt - at;
          });

          setRankings(sorted);
          setMetadata(result.metadata);
        } else {
          setError("Fehler beim Laden der Daten");
        }
      } catch (err) {
        setError("Netzwerkfehler beim Laden der Daten");
        console.error("Error fetching politician rankings:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchRankings(selectedShow, selectedYear);
  }, [selectedShow, selectedYear, fetchRankings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPartyColorClass = (partyName: string) => {
    return BADGE_PARTY_COLORS[partyName] || BADGE_PARTY_COLORS["Unbekannt"];
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-white border-yellow-500";
    if (rank === 2) return "bg-gray-400 text-white border-gray-400";
    if (rank === 3) return "bg-orange-700 text-white border-orange-700";
    if (rank <= 10) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-start sm:items-center justify-between">
          <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
          <Skeleton className="h-8 sm:h-10 w-full sm:w-48" />
        </div>
        <div className="grid gap-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header und Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
            Politiker-Rankings
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {metadata && (
              <>
                {metadata.total_politicians} Politiker gefunden
                {metadata.show_filter !== "Alle Shows" &&
                  ` in ${metadata.show_filter}`}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 items-center">
            <p>Jahr</p>
            <NativeSelect
              value={selectedYear}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedYear(e.target.value)
              }
            >
              <NativeSelectOption value="all">Insgesamt</NativeSelectOption>
              {years &&
                years.map((y) => (
                  <NativeSelectOption key={y} value={y}>
                    {y}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </div>
          <NativeSelect
            value={selectedShow}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedShow(e.target.value)
            }
          >
            {SHOW_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Rankings Liste */}
      <div className="space-y-2 sm:space-y-3">
        {rankings.length === 0 ? (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <p className="text-center text-gray-500 text-sm sm:text-base">
                Keine Daten gefunden für die ausgewählte Show.
              </p>
            </CardContent>
          </Card>
        ) : (
          rankings.map((politician, index) => {
            const rank = index + 1;

            return (
              <Card
                key={politician.politician_name}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-6">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    {/* Rang */}
                    <Badge
                      className={`${getRankBadgeColor(
                        rank
                      )} min-w-[32px] sm:min-w-[40px] justify-center flex-shrink-0`}
                    >
                      #{rank}
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Mobile Layout */}
                      <div className="sm:hidden">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex gap-1 items-center">
                              <h3 className="font-semibold text-base truncate">
                                {politician.politician_name}
                              </h3>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Link
                                    href={`politiker?search=${politician.politician_name.replace(
                                      / /g,
                                      "+"
                                    )}`}
                                  >
                                    <Eye className="cursor-pointer" size={16} />
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Genauer ansehen</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Badge
                              className={`${getPartyColorClass(
                                politician.party_name
                              )} text-xs mt-1`}
                            >
                              {politician.party_name}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {politician.total_appearances}
                            </div>
                            <div className="text-xs text-gray-500">
                              Auftritte
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                          <div className="flex gap-1">
                            {politician.shows_appeared_on > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {politician.shows_appeared_on} Shows
                              </Badge>
                            )}
                          </div>
                          <div>{formatDate(politician.latest_appearance)}</div>
                        </div>

                        {/* Mobile Show Namen */}
                        <div className="mt-2 pt-2 border-t border-gray-50">
                          <div className="text-xs text-gray-600 mb-1">
                            Auftritte in:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {politician.show_names.map((showName) => (
                              <Badge
                                key={showName}
                                variant="secondary"
                                className="text-xs"
                              >
                                {showName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:block">
                        <div className="flex gap-4 items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2.5 items-center">
                              <h3 className="font-semibold text-lg truncate">
                                {politician.politician_name}
                              </h3>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Link
                                    href={`politiker?search=${politician.politician_name.replace(
                                      / /g,
                                      "+"
                                    )}`}
                                  >
                                    <Eye className="cursor-pointer" size={16} />
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Genauer ansehen</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge
                                className={getPartyColorClass(
                                  politician.party_name
                                )}
                              >
                                {politician.party_name}
                              </Badge>
                              {politician.shows_appeared_on > 1 && (
                                <Badge variant="outline">
                                  {politician.shows_appeared_on} Shows
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                              {politician.total_appearances}
                            </div>
                            <div className="text-sm text-gray-500">
                              Auftritte
                            </div>
                          </div>

                          <div className="text-right text-sm text-gray-500">
                            <div>Letzter Auftritt:</div>
                            <div className="font-medium">
                              {formatDate(politician.latest_appearance)}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Show Namen */}
                        <div className="mt-2 pt-2 border-t border-gray-50">
                          <div className="text-xs text-gray-600 mb-1">
                            Auftritte in:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {politician.show_names.map((showName) => (
                              <Badge
                                key={showName}
                                variant="secondary"
                                className="text-xs"
                              >
                                {showName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
