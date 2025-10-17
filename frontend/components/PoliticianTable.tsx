"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "./ui/button";
import type { PoliticianAppearance } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "./ShowOptionsButtons";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

const columnHelper = createColumnHelper<PoliticianAppearance>();

export default function PoliticianTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PoliticianAppearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // Derive state from URL parameters
  const selectedShow = useMemo(() => {
    const showParam = searchParams.get("show");
    if (
      showParam &&
      SHOW_OPTIONS.some((option) => option.value === showParam)
    ) {
      return showParam;
    }
    return "all";
  }, [searchParams]);

  const globalFilter = useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (updates: { show?: string; search?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.show !== undefined) {
        if (updates.show === "all") {
          params.delete("show");
        } else {
          params.set("show", updates.show);
        }
      }

      if (updates.search !== undefined) {
        if (updates.search === "") {
          params.delete("search");
        } else {
          params.set("search", updates.search);
        }
      }

      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      router.push(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  const handleShowChange = (showValue: string) => {
    updateUrlParams({ show: showValue });
  };

  const handleSearchChange = (searchValue: string) => {
    updateUrlParams({ search: searchValue });
  };

  // Lade Daten
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/politics?type=detailed-appearances&limit=500"
          : `/api/politics?type=detailed-appearances&limit=500&show=${encodeURIComponent(
              selectedShow
            )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: FETCH_HEADERS,
      });
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedShow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const paginationStyle =
    "px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700";

  // Definiere Spalten
  const columns = useMemo(
    () => [
      columnHelper.accessor("show_name", {
        header: "Show",
        cell: (info) => {
          const show = info.getValue();
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                show === "Markus Lanz"
                  ? "bg-orange-100 text-orange-800"
                  : show === "Maybrit Illner"
                  ? "bg-purple-100 text-purple-800"
                  : show === "Caren Miosga"
                  ? "bg-green-100 text-green-800"
                  : show === "Maischberger"
                  ? "bg-teal-100 text-teal-800"
                  : show === "Hart aber fair"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {show}
            </span>
          );
        },
      }),
      columnHelper.accessor("episode_date", {
        header: "Datum",
        cell: (info) => {
          const date = new Date(info.getValue());
          return date.toLocaleDateString("de-DE");
        },
        sortingFn: "datetime",
      }),
      columnHelper.accessor("politician_name", {
        header: "Politiker",
        cell: (info) => (
          <div className="flex gap-1">
            <div className="font-semibold">{info.getValue()}</div>
            {info.row.original.abgeordnetenwatch_url && (
              <Tooltip>
                <TooltipTrigger>
                  <Link
                    href={info.row.original.abgeordnetenwatch_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="inline-block w-3 h-3 text-blue-600 mb-3 cursor-pointer" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zur Politiker-Seite</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("party_name", {
        header: "Partei",
        cell: (info) => {
          const party = info.getValue();
          const getPartyColor = (partyName: string) => {
            const colors: Record<string, string> = {
              CDU: "bg-black text-white",
              CSU: "bg-blue-800 text-white",
              SPD: "bg-red-600 text-white",
              FDP: "bg-yellow-400 text-black",
              "Die Linke": "bg-[#DF007D] text-white",
              "BÜNDNIS 90/DIE GRÜNEN": "bg-green-400 text-white",
              Grüne: "bg-green-600 text-white",
              AfD: "bg-blue-600 text-white",
              BSW: "bg-yellow-700 text-white",
              parteilos: "bg-gray-500 text-white",
              ÖVP: "bg-[#63c3d0] text-white",
            };
            return colors[partyName] || "bg-gray-400 text-white";
          };

          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${getPartyColor(
                party
              )}`}
            >
              {party}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
    },
    onGlobalFilterChange: handleSearchChange,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Lade Politiker-Daten...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header mit Suche */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Politiker-Auftritte
            </h2>
            <p className="mt-1 text-gray-600 text-sm sm:text-base">
              {table.getFilteredRowModel().rows.length} von {data.length}{" "}
              Auftritten
            </p>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 xl:justify-between">
            {/* Show Filter */}
            <div className="flex flex-wrap gap-2">
              {SHOW_OPTIONS.map((option) => {
                const getButtonColors = (
                  showValue: string,
                  isSelected: boolean
                ) => {
                  if (!isSelected)
                    return "bg-gray-100 text-gray-700 hover:bg-gray-200";

                  return ShowOptionsButtons(showValue);
                };

                return (
                  <Button
                    key={option.value}
                    onClick={() => {
                      handleShowChange(option.value);
                    }}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors ${getButtonColors(
                      option.value,
                      selectedShow === option.value
                    )}`}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>

            {/* Globale Suche */}
            <div className="relative w-80">
              <InputGroup>
                <InputGroupInput
                  placeholder="Suche nach Name oder Partei..."
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant={"secondary"}>
                    Suchen
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => {
            const data = row.original;
            const date = new Date(data.episode_date);

            const getPartyColor = (partyName: string) => {
              const colors: Record<string, string> = {
                CDU: "bg-black text-white",
                CSU: "bg-blue-800 text-white",
                SPD: "bg-red-600 text-white",
                FDP: "bg-yellow-400 text-black",
                "Die Linke": "bg-[#DF007D] text-white",
                "BÜNDNIS 90/DIE GRÜNEN": "bg-green-400 text-white",
                Grüne: "bg-green-600 text-white",
                AfD: "bg-blue-600 text-white",
                BSW: "bg-yellow-700 text-white",
                parteilos: "bg-gray-500 text-white",
              };
              return colors[partyName] || "bg-gray-400 text-white";
            };

            const getShowColor = (show: string) => {
              switch (show) {
                case "Markus Lanz":
                  return "bg-orange-100 text-orange-800";
                case "Maybrit Illner":
                  return "bg-purple-100 text-purple-800";
                case "Caren Miosga":
                  return "bg-green-100 text-green-800";
                case "Maischberger":
                  return "bg-teal-100 text-teal-800";
                case "Hart aber fair":
                  return "bg-blue-100 text-blue-800";
                default:
                  return "bg-gray-100 text-gray-800";
              }
            };

            return (
              <div key={row.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-1 font-semibold text-gray-900 text-sm">
                      {data.politician_name}
                      {data.abgeordnetenwatch_url && (
                        <Link
                          href={data.abgeordnetenwatch_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="inline-block w-3 h-3 text-blue-600 mb-3 cursor-pointer" />
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {date.toLocaleDateString("de-DE")}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getShowColor(
                      data.show_name
                    )}`}
                  >
                    {data.show_name}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getPartyColor(
                      data.party_name
                    )}`}
                  >
                    {data.party_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {{
                        asc: " 🔼",
                        desc: " 🔽",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-25"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 sm:px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-700">
            Seite {table.getState().pagination.pageIndex + 1} von{" "}
            {table.getPageCount()}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className={paginationStyle}
          >
            {"<<"}
          </Button>
          <Button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className={paginationStyle}
          >
            {"<"}
          </Button>
          <Button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className={paginationStyle}
          >
            {">"}
          </Button>
          <Button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className={paginationStyle}
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}
