import PoliticianRankings from "@/components/PoliticianRankings";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Politiker-Rankings",
};

export default function PoliticianRankingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="container mx-auto py-8 px-4">
        <PoliticianRankings />
      </div>
    </Suspense>
  );
}
