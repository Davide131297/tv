import PoliticianRankings from "@/components/PoliticianRankings";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Politiker-Rankings",
  description:
    "Rankings der häufigsten Talkshow-Gäste. Welche Politiker waren am öftesten bei Lanz, Illner, Maischberger und Co?",
  openGraph: {
    title: "Politiker-Rankings | Polittalk-Watcher",
    description:
      "Top-Listen: Die meistgeladenen Politiker in deutschen Polit-Talkshows.",
  },
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
