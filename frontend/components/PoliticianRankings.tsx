"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { getPartyBorderedBadgeClasses } from "@/lib/party-colors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import PoliticianModal from "./PoliticianModal";
import { format } from "date-fns";

interface PoliticianRanking {
  politician_name: string;
  party_name: string;
  total_appearances: number;
  shows_appeared_on: number;
  show_names: string[];
  latest_appearance: string;
  first_appearance: string;
}

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

interface PoliticianRankingsProps {
  initialData: PoliticianRanking[];
}

export default function PoliticianRankings({
  initialData,
}: PoliticianRankingsProps) {
  const getPartyColorClass = (partyName: string) => {
    return getPartyBorderedBadgeClasses(partyName);
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-white border-yellow-500";
    if (rank === 2) return "bg-gray-400 text-white border-gray-400";
    if (rank === 3) return "bg-orange-700 text-white border-orange-700";
    if (rank <= 10) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="space-y-4">
      <p className="text-sm sm:text-base text-gray-600 -mt-2 mb-2">
        {initialData.length} Top-Politiker gefunden
      </p>
      <div className="space-y-2 sm:space-y-3 relative">
        {initialData.length === 0 ? (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-center text-gray-500 text-sm sm:text-base">
              Keine Daten gefunden für die ausgewählte Show.
            </p>
          </CardContent>
        </Card>
      ) : (
        initialData.map((politician, index) => {
          const rank = index + 1;

          return (
            <Card
              key={politician.politician_name}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-6">
                <div className="flex gap-3 sm:gap-4 items-start">
                  <Badge
                    className={`${getRankBadgeColor(
                      rank,
                    )} min-w-8 sm:min-w-10 justify-center shrink-0`}
                  >
                    #{rank}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    {/* Mobile Layout */}
                    <div className="sm:hidden">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex gap-1 items-center">
                            <PoliticianModal
                              politicianName={politician.politician_name}
                              politicianParty={politician.party_name}
                              className="text-blue-500"
                            />
                            <Tooltip>
                              <TooltipTrigger>
                                <Link
                                  href={`politiker?search=${politician.politician_name.replace(
                                    / /g,
                                    "+",
                                  )}`}
                                >
                                  <Eye className="cursor-pointer" size={16} />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Shows ansehen</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Badge
                            className={`${getPartyColorClass(
                              politician.party_name,
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
                        <div>
                          {format(new Date(politician.latest_appearance), "dd.MM.yyyy")}
                        </div>
                      </div>

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
                            <PoliticianModal
                              politicianName={politician.politician_name}
                              politicianParty={politician.party_name}
                              className="hover:underline hover:text-blue-600 cursor-pointer font-bold text-lg"
                            />
                            <Tooltip>
                              <TooltipTrigger>
                                <Link
                                  href={`politiker?search=${politician.politician_name.replace(
                                    / /g,
                                    "+",
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
                                politician.party_name,
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
                            {format(
                              new Date(politician.latest_appearance),
                              "dd.MM.yyyy",
                            )}
                          </div>
                        </div>
                      </div>

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
