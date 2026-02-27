import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton layout matching the overview page (4 stat cards + averages section).
 */
export function OverviewSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Title */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-96 mb-4" />
        <div className="flex gap-2 mt-4 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 space-y-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Averages section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton layout matching a data table (e.g. PoliticianTable, SendungenPageContent).
 */
export function TableSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 space-y-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for only the table part, used when filtering.
 */
export function TableOnlySkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b px-4 py-3 flex gap-4 bg-gray-50">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton with stats cards and a table.
 */
export function StatsAndTableSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 space-y-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b px-4 py-3 flex gap-4 bg-gray-50">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton layout matching the rankings page (numbered list with badges).
 */
export function RankingsSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      <Skeleton className="h-8 w-56 mb-2" />
      <Skeleton className="h-5 w-80 mb-6" />

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-lg" />
        ))}
      </div>

      {/* Ranking items */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-sm p-4 mb-3 flex items-center gap-4"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-10" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton layout matching the chart pages (bar/line chart area).
 */
export function ChartSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton className="h-7 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-4" />

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>

        {/* Chart area */}
        <div className="bg-gray-50 rounded-md p-4">
          <div className="flex items-end gap-3 h-64">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-md"
                style={{ height: `${30 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for only the overview data part (stats cards + averages), used when filtering.
 */
export function OverviewOnlySkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Show-spezifische Überschrift */}
      <div className="mb-6">
        <Skeleton className="h-7 w-64" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 space-y-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Averages section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for only the rankings list part, used when filtering.
 */
export function RankingsOnlySkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Ranking items */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-sm p-4 mb-3 flex items-center gap-4"
        >
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-10" />
        </div>
      ))}
    </div>
  );
}
