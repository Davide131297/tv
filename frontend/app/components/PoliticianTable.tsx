"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

interface PoliticianAppearance {
  show_name: string;
  episode_date: string;
  politician_id: number;
  party_id: number | null;
  politician_name: string;
  party_name: string;
  politician_details: {
    first_name: string;
    last_name: string;
    occupation: string;
    year_of_birth: number;
    education: string;
  };
}

const columnHelper = createColumnHelper<PoliticianAppearance>();

export default function PoliticianTable() {
  const [data, setData] = useState<PoliticianAppearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selectedShow, setSelectedShow] = useState<string>("all");

  const showOptions = [
    { value: "all", label: "Alle Shows" },
    { value: "Markus Lanz", label: "Markus Lanz" },
    { value: "Maybrit Illner", label: "Maybrit Illner" },
  ];

  // Lade Daten
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/politics?type=detailed-appearances&limit=200"
          : `/api/politics?type=detailed-appearances&limit=200&show=${encodeURIComponent(
              selectedShow
            )}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        console.log("Daten geladen:", result.data);
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
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
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
          <div>
            <div className="font-semibold">{info.getValue()}</div>
            <div className="text-sm text-gray-500">
              {info.row.original.politician_details.occupation}
            </div>
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
              "Die Linke": "bg-purple-600 text-white",
              "BÜNDNIS 90/DIE GRÜNEN": "bg-green-600 text-white",
              Grüne: "bg-green-600 text-white",
              AfD: "bg-blue-600 text-white",
              BSW: "bg-yellow-700 text-white",
              parteilos: "bg-gray-500 text-white",
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
    onGlobalFilterChange: setGlobalFilter,
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
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Politiker-Auftritte
            </h2>
            <p className="mt-1 text-gray-600">
              {table.getFilteredRowModel().rows.length} von {data.length}{" "}
              Auftritten
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Show Filter */}
            <div className="flex flex-wrap gap-2">
              {showOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedShow(option.value)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    selectedShow === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Globale Suche */}
            <div className="relative">
              <input
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Suche nach Name oder Partei..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aktualisieren
            </button>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto">
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
      <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            Seite {table.getState().pagination.pageIndex + 1} von{" "}
            {table.getPageCount()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            {"<<"}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            {"<"}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            {">"}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            {">>"}
          </button>
        </div>
      </div>
    </div>
  );
}
