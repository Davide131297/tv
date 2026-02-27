"use client";

import { useState, useMemo } from "react";
import { getPartyBadgeClasses, getShowBadgeClasses } from "@/lib/party-colors";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { Button } from "./ui/button";
import type { PoliticianEpisodeAppearance } from "@/types";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import PoliticianModal from "./PoliticianModal";

const columnHelper = createColumnHelper<PoliticianEpisodeAppearance>();

function normalizeUrl(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `${window.location.protocol}${trimmed}`;
  if (/^www\./i.test(trimmed) || /^[a-zA-Z0-9.-]+\.[a-z]{2,}/.test(trimmed))
    return `https://${trimmed}`;
  return trimmed;
}

interface PoliticianTableProps {
  initialData: PoliticianEpisodeAppearance[];
  totalCount: number;
  initialShow: string;
  initialYear: string;
  initialSearch: string;
  currentPage: number;
  pageSize: number;
}

export default function PoliticianTable({
  initialData,
  totalCount,
  currentPage,
  pageSize
}: PoliticianTableProps) {
  const updateUrl = useUrlUpdater();
  
  const [sorting, setSorting] = useState<SortingState>([]);

  const handlePageChange = (page: number) => {
    updateUrl({ page: String(page) });
  };

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
    data: initialData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const paginationStyle =
    "px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800";

  return (
    <div className="bg-white rounded-b-lg shadow-lg overflow-hidden relative border-t border-gray-100">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-gray-600 text-sm font-medium">
          {totalCount} Auftritte gefunden
        </p>
      </div>

      {/* Mobile Card Layout */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => {
            const rowData = row.original;
            const date = new Date(rowData.episode_date);

            return (
              <div key={row.id} className="p-4">
                <div className="flex justify-between">
                  <div className="space-y-3">
                    <div>
                      <PoliticianModal
                        politicianName={rowData.politician_name}
                        politicianParty={rowData.party_name}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm text-blue-600"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {date.toLocaleDateString("de-DE")}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getShowBadgeClasses(
                          rowData.show_name,
                        )}`}
                      >
                        {rowData.show_name}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getPartyBadgeClasses(
                          rowData.party_name,
                        )}`}
                      >
                        {rowData.party_name}
                      </span>
                    </div>
                  </div>
                  <div>
                    {rowData.episode_url && (
                      <Link
                        href={normalizeUrl(rowData.episode_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                        </Button>
                      </Link>
                    )}
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
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
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
            Seite {currentPage} von {Math.ceil(totalCount / pageSize)}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1}
            className={paginationStyle}
          >
            {"<<"}
          </Button>
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={paginationStyle}
          >
            {"<"}
          </Button>
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            className={paginationStyle}
          >
            {">"}
          </Button>
          <Button
            onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            className={paginationStyle}
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}
