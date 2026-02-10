"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getPartyBadgeClasses, getShowBadgeClasses } from "@/lib/party-colors";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import PoliticianModal from "./PoliticianModal";
import { useYearList } from "@/hooks/useYearList";
import { useSelectedShow } from "@/hooks/useSelectedShow";

const columnHelper = createColumnHelper<PoliticianAppearance>();

// Normalize episode URLs coming from DB/crawlers.
// - If URL already has http(s):// return as-is
// - If it starts with '//' prepend current protocol
// - If it starts with 'www.' or looks like a host, prepend https://
// - Otherwise return as-is (could be an internal/relative link)
function normalizeUrl(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `${window.location.protocol}${trimmed}`;
  if (/^www\./i.test(trimmed) || /^[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(trimmed))
    return `https://${trimmed}`;
  return trimmed;
}

export default function PoliticianTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const years = useYearList(2024);
  const selectedShow = useSelectedShow(searchParams, SHOW_OPTIONS);
  const [data, setData] = useState<PoliticianAppearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  const [localShow, setLocalShow] = useState<string>(selectedShow);

  // Sync localShow with URL on mount/navigation
  useEffect(() => {
    setLocalShow(selectedShow);
  }, [selectedShow]);

  const updateUrl = useUrlUpdater();

  const globalFilter = useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  // Initialisiere searchInput mit dem Wert aus der URL
  useEffect(() => {
    const searchFromUrl = searchParams.get("search") || "";
    setSearchInput(searchFromUrl);
  }, [searchParams]);

  const handleShowChange = (showValue: string) => {
    setLocalShow(showValue);
    updateUrl({ show: showValue });
  };

  const handleSearchChange = (searchValue: string) => {
    updateUrl({ search: searchValue });
  };

  const handleSearchSubmit = () => {
    updateUrl({ search: searchInput });
  };

  const handleYearChange = (yearValue: string) => {
    setSelectedYear(yearValue);
    updateUrl({ year: yearValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  // Lade Daten
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        localShow === "all"
          ? "/api/politics?type=detailed-appearances&limit=1000&year=" +
            encodeURIComponent(selectedYear)
          : `/api/politics?type=detailed-appearances&limit=1000&show=${encodeURIComponent(
              localShow,
            )}&year=${encodeURIComponent(selectedYear)}`;

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
  }, [localShow, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const search = searchParams.get("year");
    if (search && search !== selectedYear) {
      setSelectedYear(search);
    }
  }, [searchParams, selectedYear]);

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
              className={`px-2 py-1 rounded-full text-xs font-semibold ${getShowBadgeClasses(show)}`}
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
          const rawUrl = info.row.original.episode_url;
          const url = normalizeUrl(rawUrl);
          const formatted = date.toLocaleDateString("de-DE");
          return url ? (
            <Tooltip>
              <TooltipTrigger>
                <Link
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-blue-500 hover:text-blue-800 hover:underline"
                >
                  {formatted}
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zur Sendung</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            formatted
          );
        },
        sortingFn: "datetime",
      }),
      columnHelper.accessor("politician_name", {
        header: "Politiker",
        cell: (info) => (
          <PoliticianModal
            politicianName={info.getValue()}
            politicianParty={info.row.original.party_name}
            className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap px-3 py-1 rounded text-sm text-blue-600 hover:text-blue-800 hover:underline"
          />
        ),
      }),
      columnHelper.accessor("party_name", {
        header: "Partei",
        cell: (info) => {
          const party = info.getValue();
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${getPartyBadgeClasses(party)}`}
            >
              {party}
            </span>
          );
        },
      }),
    ],
    [],
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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden relative">
      {loading && <LoadingOverlay text="Lade Politiker-Daten..." />}
      {/* Header mit Suche */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Politiker-Auftritte
              </h2>
              <p className="mt-1 text-gray-600 text-sm sm:text-base">
                {table.getFilteredRowModel().rows.length} von {data.length}{" "}
                Auftritten
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <p>Jahr</p>
              <NativeSelect
                value={selectedYear}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleYearChange && handleYearChange(e.target.value)
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
          </div>

          <div className="flex flex-col xl:flex-row gap-4 xl:justify-between">
            {/* Show Filter */}
            <ShowOptionsButtons
              onShowChange={handleShowChange}
              selectedShow={localShow}
            />

            {/* Globale Suche */}
            <div className="relative w-full md:w-96">
              <InputGroup>
                <InputGroupInput
                  placeholder="Suche nach Name oder Partei..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant={"secondary"}
                    onClick={handleSearchSubmit}
                  >
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

            return (
              <div key={row.id} className="p-4">
                <div className="flex justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <PoliticianModal
                          politicianName={data.politician_name}
                          politicianParty={data.party_name}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm text-blue-600"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {date.toLocaleDateString("de-DE")}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getShowBadgeClasses(
                          data.show_name,
                        )}`}
                      >
                        {data.show_name}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getPartyBadgeClasses(
                          data.party_name,
                        )}`}
                      >
                        {data.party_name}
                      </span>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const normalizedEpisodeUrl = normalizeUrl(
                        data.episode_url,
                      );
                      return normalizedEpisodeUrl ? (
                        <Link
                          href={normalizedEpisodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-0.5 items-center text-xs"
                        >
                          <Button variant="outline" size="sm">
                            <p className="text-[10px]">Zur Episode</p>
                            <ExternalLink className="inline-block w-3 h-3 text-blue-600" />
                          </Button>
                        </Link>
                      ) : null;
                    })()}
                  </div>
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
                            header.getContext(),
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
