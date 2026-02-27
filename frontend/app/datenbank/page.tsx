import DatabaseEntries from "@/components/database/DatabaseEntries";
import type { Metadata } from "next";
import { getDatabaseEntries } from "@/lib/politics-data";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/page-skeletons";

export const metadata: Metadata = {
  title: "Datenbank",
  description:
    "Vollständige Datenbank aller TV-Show-Politiker-Einträge. Durchsuchbares Archiv mit Feedback-Möglichkeit.",
  openGraph: {
    title: "Datenbank | Polittalk-Watcher",
    description: "Durchsuchbare Datenbank aller erfassten Politiker-Auftritte.",
  },
};

export default async function DatabasePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Datenbank Einträge
          </h1>
          <p className="mt-2 text-gray-600">
            Alle TV-Show-Politiker-Einträge aus der Datenbank. Du kannst
            Feedback zu einzelnen Einträgen geben.
          </p>
        </div>

        <Suspense key={page} fallback={<TableSkeleton />}>
          <DatabaseDataWrapper page={page} />
        </Suspense>
      </div>
    </div>
  );
}

async function DatabaseDataWrapper({ page }: { page: number }) {
  const data = await getDatabaseEntries({ page, limit: 50 });
  
  return (
    <DatabaseEntries 
      initialData={data.entries}
      totalCount={data.totalCount}
      currentPage={data.page}
      totalPages={data.totalPages}
    />
  );
}
