import PoliticianTable from "@/components/PoliticianTable";
import PoliticianFilters from "@/components/PoliticianFilters";
import { Suspense } from "react";
import { TableOnlySkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";
import { getDetailedAppearances } from "@/lib/politics-data";

export const metadata: Metadata = {
  title: "Politiker",
  description:
    "Detaillierte Übersicht aller Politiker mit ihren Auftritten in deutschen TV-Talkshows. Statistiken zu Häufigkeit und Sendungen.",
  openGraph: {
    title: "Politiker-Übersicht | Polittalk-Watcher",
    description:
      "Alle Politiker und ihre Auftritte bei Lanz, Illner, Maischberger, Miosga.",
  },
};

export default async function PoliticiansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "all";
  const year = typeof params.year === "string" ? params.year : String(new Date().getFullYear());
  const search = typeof params.search === "string" ? params.search : "";
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📋 Politiker-Übersicht
        </h1>
        <p className="text-gray-600">
          Detaillierte Übersicht aller Politiker mit ihren Auftritten in
          deutschen TV-Talkshows
        </p>
      </div>

      <PoliticianFilters 
        initialShow={show} 
        initialYear={year} 
        initialSearch={search} 
      />
      
      <Suspense key={`${show}-${year}-${search}-${page}`} fallback={<TableOnlySkeleton />}>
        <PoliticianDataWrapper 
          show={show} 
          year={year} 
          search={search} 
          offset={offset} 
          pageSize={pageSize}
          currentPage={page}
        />
      </Suspense>
    </div>
  );
}

async function PoliticianDataWrapper({ 
  show, 
  year, 
  search, 
  offset, 
  pageSize,
  currentPage
}: { 
  show: string; 
  year: string; 
  search: string; 
  offset: number; 
  pageSize: number;
  currentPage: number;
}) {
  const { data, total } = await getDetailedAppearances({ 
    show, 
    year, 
    search, 
    limit: pageSize, 
    offset 
  });
  
  return (
    <PoliticianTable 
      initialData={data} 
      totalCount={total}
      initialShow={show}
      initialYear={year}
      initialSearch={search}
      currentPage={currentPage}
      pageSize={pageSize}
    />
  );
}
