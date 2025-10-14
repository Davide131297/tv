"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { FETCH_HEADERS } from "@/lib/utils";
import { BADGE_PARTY_COLORS } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

interface PoliticianRanking {
  politician_name: string;
  party_name: string;
  total_appearances: number;
  shows_appeared_on: number;
  show_names: string[];
  latest_appearance: string;
  first_appearance: string;
}

interface GroupedRanking {
  rank: number;
  total_appearances: number;
  politicians: PoliticianRanking[];
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
  const [groupedRankings, setGroupedRankings] = useState<GroupedRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string>("all");
  const [metadata, setMetadata] = useState<
    PoliticianRankingsResponse["metadata"] | null
  >(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Function to group politicians by appearance count
  const groupPoliticiansByAppearances = useCallback(
    (politicians: PoliticianRanking[]): GroupedRanking[] => {
      const groups: { [key: number]: PoliticianRanking[] } = {};

      // Group politicians by total_appearances
      politicians.forEach((politician) => {
        if (!groups[politician.total_appearances]) {
          groups[politician.total_appearances] = [];
        }
        groups[politician.total_appearances].push(politician);
      });

      // Convert to array and calculate ranks
      const groupedArray: GroupedRanking[] = [];
      let currentRank = 1;

      // Sort by appearances (descending)
      const sortedAppearanceCounts = Object.keys(groups)
        .map(Number)
        .sort((a, b) => b - a);

      sortedAppearanceCounts.forEach((appearanceCount) => {
        const politiciansInGroup = groups[appearanceCount];

        groupedArray.push({
          rank: currentRank,
          total_appearances: appearanceCount,
          politicians: politiciansInGroup.sort((a, b) => {
            // First sort by latest appearance (most recent first)
            const dateA = new Date(a.latest_appearance);
            const dateB = new Date(b.latest_appearance);
            if (dateA.getTime() !== dateB.getTime()) {
              return dateB.getTime() - dateA.getTime();
            }

            // Then sort by shows appeared on (most shows first)
            if (a.shows_appeared_on !== b.shows_appeared_on) {
              return b.shows_appeared_on - a.shows_appeared_on;
            }

            // Finally sort alphabetically by name
            return a.politician_name.localeCompare(b.politician_name);
          }),
        });

        // Update rank for next group
        currentRank += politiciansInGroup.length;
      });

      return groupedArray;
    },
    []
  );

  const fetchRankings = useCallback(
    async (showFilter: string = "") => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type: "politician-rankings",
          limit: "100",
        });

        if (showFilter && showFilter !== "all") {
          params.set("show", showFilter);
        }

        const response = await fetch(`/api/politics?${params}`, {
          method: "GET",
          headers: FETCH_HEADERS,
        });
        const result: PoliticianRankingsResponse = await response.json();

        if (result.success) {
          setRankings(result.data);
          setGroupedRankings(groupPoliticiansByAppearances(result.data));
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
    [groupPoliticiansByAppearances]
  );

  useEffect(() => {
    fetchRankings(selectedShow);
  }, [selectedShow, fetchRankings]);

  useEffect(() => {
    // Initially expand top 3 ranking groups
    if (groupedRankings.length > 0) {
      const initialExpanded = new Set<string>();
      groupedRankings.slice(0, 3).forEach((group) => {
        initialExpanded.add(`${group.rank}-${group.total_appearances}`);
      });
      setExpandedCards(initialExpanded);
    }
  }, [groupedRankings]);

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

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

        <Select value={selectedShow} onValueChange={setSelectedShow}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Show auswählen" />
          </SelectTrigger>
          <SelectContent>
            {SHOW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rankings Liste */}
      <div className="space-y-2 sm:space-y-3">
        {groupedRankings.length === 0 ? (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <p className="text-center text-gray-500 text-sm sm:text-base">
                Keine Daten gefunden für die ausgewählte Show.
              </p>
            </CardContent>
          </Card>
        ) : (
          groupedRankings.map((group) => {
            const isMultiplePoliticians = group.politicians.length > 1;
            const cardId = `${group.rank}-${group.total_appearances}`;
            const isExpanded = expandedCards.has(cardId);

            return (
              <Card key={cardId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-6">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    {/* Rang */}
                    <Badge
                      className={`${getRankBadgeColor(
                        group.rank
                      )} min-w-[32px] sm:min-w-[40px] justify-center flex-shrink-0`}
                    >
                      #{group.rank}
                      {isMultiplePoliticians && (
                        <span className="ml-1 text-xs">
                          ({group.politicians.length})
                        </span>
                      )}
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header with Toggle Button */}
                      <div
                        className="cursor-pointer flex justify-between items-center mb-3"
                        onClick={() => toggleCard(cardId)}
                      >
                        <div className="text-lg sm:text-xl font-bold text-blue-600">
                          {group.total_appearances} Auftritte
                        </div>
                        <div className="flex items-center gap-2">
                          {isMultiplePoliticians && (
                            <Badge variant="outline" className="text-xs">
                              {group.politicians.length} Politiker
                            </Badge>
                          )}
                          <span
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label={isExpanded ? "Zuklappen" : "Aufklappen"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-600 transition-transform duration-200" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-600 transition-transform duration-200" />
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Collapsible Politicians Content */}
                      <div
                        className={`transition-all duration-200 ease-in-out ${
                          isExpanded
                            ? "max-h-[2000px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                        style={{
                          overflow: isExpanded ? "visible" : "hidden",
                        }}
                      >
                        <div
                          className={`space-y-2 sm:space-y-3 ${
                            isExpanded ? "pb-0" : "pb-0"
                          }`}
                        >
                          {group.politicians.map((politician, index) => (
                            <div
                              key={politician.politician_name}
                              className={`${
                                isMultiplePoliticians && index > 0
                                  ? "border-t border-gray-100 pt-2 sm:pt-3"
                                  : ""
                              } ${
                                isMultiplePoliticians && index % 2 === 1
                                  ? "bg-gray-50 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 sm:py-3 rounded-lg"
                                  : ""
                              }`}
                            >
                              {/* Mobile Layout */}
                              <div className="sm:hidden">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-semibold text-base truncate">
                                      {politician.politician_name}
                                    </h3>
                                    <Badge
                                      className={`${getPartyColorClass(
                                        politician.party_name
                                      )} text-xs mt-1`}
                                    >
                                      {politician.party_name}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-xs text-gray-500">
                                  <div className="flex gap-1">
                                    {politician.shows_appeared_on > 1 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {politician.shows_appeared_on} Shows
                                      </Badge>
                                    )}
                                  </div>
                                  <div>
                                    {formatDate(politician.latest_appearance)}
                                  </div>
                                </div>

                                {/* Mobile Show Namen */}
                                {politician.show_names.length > 1 && (
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
                                )}
                              </div>

                              {/* Desktop Layout */}
                              <div className="hidden sm:flex gap-4 items-center justify-between">
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
                                          <Eye
                                            className="cursor-pointer"
                                            size={16}
                                          />
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

                                <div className="text-right text-sm text-gray-500">
                                  <div>Letzter Auftritt:</div>
                                  <div className="font-medium">
                                    {formatDate(politician.latest_appearance)}
                                  </div>
                                </div>
                              </div>

                              {/* Desktop Show Namen (wenn mehrere) */}
                              {politician.show_names.length > 1 && (
                                <div className="hidden sm:block mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-50">
                                  <div className="text-xs sm:text-sm text-gray-600 mb-1">
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
                              )}
                            </div>
                          ))}
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

      {/* Footer Info */}
      {groupedRankings.length > 0 && (
        <Card>
          <CardContent className="pt-3 sm:pt-4">
            <div className="text-xs sm:text-sm text-gray-600 text-center">
              {rankings.length} Politiker in {groupedRankings.length}{" "}
              Ranggruppen
              {metadata?.show_filter !== "Alle Shows" &&
                ` in ${metadata?.show_filter}`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
