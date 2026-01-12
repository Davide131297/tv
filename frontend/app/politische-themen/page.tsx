import PoliticalAreasPageContent from "@/components/PoliticalAreasPageContent";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politische Themen",
  description:
    "Analyse der diskutierten politischen Themen in deutschen Talkshows. Welche Themen dominieren bei Lanz, Illner und Co?",
  openGraph: {
    title: "Politische Themen | Polittalk-Watcher",
    description:
      "Themenanalyse: Welche politischen Bereiche werden in Talkshows am häufigsten besprochen?",
  },
};

export default function PoliticalAreasPage() {
  return (
    <Suspense fallback={""}>
      <PoliticalAreasPageContent />
    </Suspense>
  );
}
